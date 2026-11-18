import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { TvError, type RemoteKey, type SavedTv, type TvErrorCode } from '@/domain/tv';
import { fetchDeviceIdentity } from '@/protocols/smart-center/device-info';
import {
  DIAL_APPS,
  getDialAppStatus,
  isLaunchAccepted,
  launchDialApp,
  type DialAppDefinition,
  type DialAppId,
  type DialAppStatus,
} from '@/protocols/smart-center/dial-apps';
import { discoverSmartCenterTvs } from '@/protocols/smart-center/discover';
import {
  isSmartCenterRunning,
  probeSmartCenter,
  type SmartCenterProbeResult,
} from '@/protocols/smart-center/probe';
import { sendSmartCenterKey } from '@/protocols/smart-center/send-key';

import { loadCustomApps, writeCustomApps } from './custom-apps-storage';
import { useSavedTvs } from './saved-tvs-context';

/**
 * The protocol is stateless HTTP, so "connected" means: the last check of this TV succeeded
 * and it is the TV the remote sends to. It is not a live socket.
 */
export type ConnectionState =
  | { status: 'disconnected' }
  /** `searching`: the TV did not answer at its saved address; looking for it on the network by identity. */
  | { status: 'connecting'; tv: SavedTv; searching?: boolean }
  | { status: 'connected'; tv: SavedTv; probe: SmartCenterProbeResult }
  | { status: 'error'; tv: SavedTv; code: TvErrorCode };

export type CommandTarget = { type: 'key'; key: RemoteKey } | { type: 'app'; appId: DialAppId };

export type LastCommand =
  | { target: CommandTarget; ok: true; httpStatus: number; elapsedMs: number }
  /** `httpStatus` is set when the TV answered but refused (e.g. 403 for an app it does not allow). */
  | { target: CommandTarget; ok: false; code: TvErrorCode; httpStatus?: number };

export type AppsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; apps: DialAppStatus[] };

export type AddAppResult = 'added' | 'alreadyAdded' | 'notFound' | 'failed';

type ConnectionContextValue = {
  state: ConnectionState;
  connect: (tv: SavedTv) => Promise<void>;
  disconnect: () => void;
  sendKey: (key: RemoteKey) => void;
  lastCommand: LastCommand | null;
  apps: AppsState;
  refreshApps: () => void;
  launchApp: (appId: DialAppId) => void;
  /** Ids of apps the user added from search (removable). */
  customAppIds: ReadonlySet<DialAppId>;
  /** Checks the app on the TV (read-only GETs) and saves it only if the TV knows it. */
  addApp: (app: DialAppDefinition) => Promise<AddAppResult>;
  removeApp: (appId: DialAppId) => void;
};

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

const toCode = (error: unknown): TvErrorCode => (error instanceof TvError ? error.code : 'unknown');

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const { tvs, updateTv } = useSavedTvs();
  const [state, setState] = useState<ConnectionState>({ status: 'disconnected' });
  const [lastCommand, setLastCommand] = useState<LastCommand | null>(null);
  const [apps, setApps] = useState<AppsState>({ status: 'idle' });
  const [customApps, setCustomApps] = useState<DialAppDefinition[]>([]);
  const customAppsRef = useRef<DialAppDefinition[]>([]);

  const connectAbortRef = useRef<AbortController | null>(null);
  // Requests to the TV go one at a time: community reports say its server can hang on parallel requests.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback((task: () => Promise<void>) => {
    queueRef.current = queueRef.current.then(task, task);
  }, []);

  const connectedIp = state.status === 'connected' ? state.tv.ipAddress : null;

  const disconnect = useCallback(() => {
    connectAbortRef.current?.abort();
    setState({ status: 'disconnected' });
    setLastCommand(null);
    setApps({ status: 'idle' });
  }, []);

  const connect = useCallback(async (tv: SavedTv) => {
    connectAbortRef.current?.abort();
    const controller = new AbortController();
    connectAbortRef.current = controller;
    setState({ status: 'connecting', tv });
    setLastCommand(null);
    setApps({ status: 'idle' });

    const { signal } = controller;
    const markConnected = async (target: SavedTv, probe: SmartCenterProbeResult) => {
      setState({ status: 'connected', tv: target, probe });
      // Older saved TVs have no identity yet: read it once so future IP changes are handled.
      if (!target.deviceId) {
        const identity = await fetchDeviceIdentity({ ipAddress: target.ipAddress, signal });
        if (identity && !signal.aborted) {
          const updated = updateTv(target.id, { deviceId: identity.deviceId, model: identity.model });
          if (updated) setState({ status: 'connected', tv: updated, probe });
        }
      }
    };

    try {
      const probe = await probeSmartCenter({ ipAddress: tv.ipAddress, signal });
      if (signal.aborted) return;
      if (isSmartCenterRunning(probe)) await markConnected(tv, probe);
      else setState({ status: 'error', tv, code: 'unsupported' });
      return;
    } catch (error) {
      const code = toCode(error);
      if (code === 'cancelled') return;
      // Wrong / changed address and the TV has a known identity: look for it on the network.
      if (!tv.deviceId || (code !== 'unreachable' && code !== 'timeout')) {
        setState({ status: 'error', tv, code });
        return;
      }
    }

    setState({ status: 'connecting', tv, searching: true });
    try {
      const found = await discoverSmartCenterTvs({ signal });
      if (signal.aborted) return;
      const match = found.find((f) => f.identity?.deviceId === tv.deviceId);
      if (!match) {
        setState({ status: 'error', tv, code: 'unreachable' });
        return;
      }
      const moved = updateTv(tv.id, { ipAddress: match.ipAddress }) ?? { ...tv, ipAddress: match.ipAddress };
      await markConnected(moved, match.probe);
    } catch (error) {
      const code = toCode(error);
      if (code !== 'cancelled') setState({ status: 'error', tv, code: code === 'unknown' ? 'unreachable' : code });
    }
  }, [updateTv]);

  const sendKey = useCallback(
    (key: RemoteKey) => {
      if (!connectedIp) return;
      enqueue(async () => {
        try {
          const result = await sendSmartCenterKey({ ipAddress: connectedIp, key });
          setLastCommand(
            result.httpStatus >= 200 && result.httpStatus < 300
              ? { target: { type: 'key', key }, ok: true, ...result }
              : { target: { type: 'key', key }, ok: false, code: 'unsupported', httpStatus: result.httpStatus },
          );
        } catch (error) {
          // Never retried automatically (AGENTS.md): the user can press again.
          setLastCommand({ target: { type: 'key', key }, ok: false, code: toCode(error) });
        }
      });
    },
    [connectedIp, enqueue],
  );

  const refreshApps = useCallback(() => {
    if (!connectedIp) return;
    setApps({ status: 'loading' });
    enqueue(async () => {
      const results: DialAppStatus[] = [];
      for (const app of [...DIAL_APPS, ...customAppsRef.current]) {
        try {
          results.push(await getDialAppStatus({ ipAddress: connectedIp, app }));
        } catch {
          // Timeout / unreachable for one app: treat as not available, keep checking the others.
          results.push({ id: app.id, label: app.label, installed: false, httpStatus: 0 });
        }
      }
      setApps({ status: 'ready', apps: results });
    });
  }, [connectedIp, enqueue]);

  const launchApp = useCallback(
    (appId: DialAppId) => {
      if (!connectedIp || apps.status !== 'ready') return;
      // Only apps the TV reported (with the DIAL name it answered to) can be launched.
      const dialName = apps.apps.find((app) => app.id === appId && app.installed)?.dialName;
      if (!dialName) return;
      enqueue(async () => {
        try {
          const result = await launchDialApp({ ipAddress: connectedIp, dialName });
          setLastCommand(
            isLaunchAccepted(result.httpStatus)
              ? { target: { type: 'app', appId }, ok: true, ...result }
              : { target: { type: 'app', appId }, ok: false, code: 'unsupported', httpStatus: result.httpStatus },
          );
        } catch (error) {
          setLastCommand({ target: { type: 'app', appId }, ok: false, code: toCode(error) });
        }
      });
    },
    [connectedIp, apps, enqueue],
  );

  const persistCustomApps = useCallback((next: DialAppDefinition[]) => {
    customAppsRef.current = next;
    setCustomApps(next);
    // Best effort: a failed write only means the app is not remembered after restart.
    writeCustomApps(next).catch(() => {});
  }, []);

  const addApp = useCallback(
    (app: DialAppDefinition): Promise<AddAppResult> => {
      const known = [...DIAL_APPS, ...customAppsRef.current];
      if (known.some((a) => a.id === app.id)) return Promise.resolve('alreadyAdded');
      if (!connectedIp) return Promise.resolve('failed');

      return new Promise((resolve) => {
        enqueue(async () => {
          try {
            const status = await getDialAppStatus({ ipAddress: connectedIp, app });
            if (!status.installed || !status.dialName) {
              resolve('notFound');
              return;
            }
            // Remember only the name the TV answered to.
            persistCustomApps([
              ...customAppsRef.current,
              { id: app.id, label: app.label, dialNames: [status.dialName] },
            ]);
            setApps((prev) =>
              prev.status === 'ready' ? { status: 'ready', apps: [...prev.apps, status] } : prev,
            );
            resolve('added');
          } catch {
            resolve('failed');
          }
        });
      });
    },
    [connectedIp, enqueue, persistCustomApps],
  );

  const removeApp = useCallback(
    (appId: DialAppId) => {
      persistCustomApps(customAppsRef.current.filter((a) => a.id !== appId));
      setApps((prev) =>
        prev.status === 'ready'
          ? { status: 'ready', apps: prev.apps.filter((a) => a.id !== appId) }
          : prev,
      );
    },
    [persistCustomApps],
  );

  const customAppIds = useMemo(() => new Set(customApps.map((a) => a.id)), [customApps]);

  // Load apps the user added earlier.
  useEffect(() => {
    let active = true;
    loadCustomApps()
      .then((loaded) => {
        if (!active) return;
        customAppsRef.current = loaded;
        setCustomApps(loaded);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Check which apps the TV exposes once per connection.
  useEffect(() => {
    if (connectedIp) refreshApps();
  }, [connectedIp, refreshApps]);

  // If the connected TV is removed in Settings, drop the connection.
  useEffect(() => {
    if (state.status !== 'disconnected' && !tvs.some((tv) => tv.id === state.tv.id)) {
      disconnect();
    }
  }, [tvs, state, disconnect]);

  useEffect(() => () => connectAbortRef.current?.abort(), []);

  const value = useMemo(
    () => ({
      state,
      connect,
      disconnect,
      sendKey,
      lastCommand,
      apps,
      refreshApps,
      launchApp,
      customAppIds,
      addApp,
      removeApp,
    }),
    [
      state,
      connect,
      disconnect,
      sendKey,
      lastCommand,
      apps,
      refreshApps,
      launchApp,
      customAppIds,
      addApp,
      removeApp,
    ],
  );

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error('useConnection must be used inside ConnectionProvider');
  return ctx;
}