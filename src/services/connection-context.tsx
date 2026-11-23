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
import { sendSmartCenterKey, sendSmartCenterTestCode, type SendKeyResult } from '@/protocols/smart-center/send-key';

import { loadCustomApps, writeCustomApps } from './custom-apps-storage';
import { loadLastTvApps, saveLastTvApps, type LastTvApps } from './last-tv-apps-storage';
import { loadLastTvId, saveLastTvId } from './last-tv-storage';
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

export type CommandTarget =
  | { type: 'key'; key: RemoteKey }
  | { type: 'app'; appId: DialAppId }
  /** Raw code from the code tester. */
  | { type: 'code'; code: number };

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
  /** `skipIfBusy`: drop the press if the TV still has requests queued (used for held-key repeat). */
  sendKey: (key: RemoteKey, options?: { skipIfBusy?: boolean }) => void;
  /** Code tester (temporary): sends a raw code; only codes allowed by `isTestableCode`. */
  sendTestCode: (code: number) => void;
  lastCommand: LastCommand | null;
  apps: AppsState;
  refreshApps: () => void;
  launchApp: (appId: DialAppId) => void;
  /** Ids of apps the user added from search (removable). */
  customAppIds: ReadonlySet<DialAppId>;
  /** Checks the app on the TV (read-only GETs) and saves it only if the TV knows it. */
  addApp: (app: DialAppDefinition) => Promise<AddAppResult>;
  removeApp: (appId: DialAppId) => void;
  /**
   * Last TV that reported its apps, with those apps. Shown while no TV is connected;
   * null if that TV was removed or nothing was saved yet.
   */
  lastTv: { tv: SavedTv; apps: LastTvApps['apps'] } | null;
};

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

const toCode = (error: unknown): TvErrorCode => (error instanceof TvError ? error.code : 'unknown');

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const { tvs, updateTv, status: savedTvsStatus } = useSavedTvs();
  const [state, setState] = useState<ConnectionState>({ status: 'disconnected' });
  const [lastCommand, setLastCommand] = useState<LastCommand | null>(null);
  const [apps, setApps] = useState<AppsState>({ status: 'idle' });
  const [customApps, setCustomApps] = useState<DialAppDefinition[]>([]);
  const [lastTvApps, setLastTvApps] = useState<LastTvApps | null>(null);
  const customAppsRef = useRef<DialAppDefinition[]>([]);

  const connectAbortRef = useRef<AbortController | null>(null);
  // Requests to the TV go one at a time: community reports say its server can hang on parallel requests.
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingRef = useRef(0);

  const enqueue = useCallback((task: () => Promise<void>) => {
    pendingRef.current += 1;
    const run = () => task().finally(() => (pendingRef.current -= 1));
    queueRef.current = queueRef.current.then(run, run);
  }, []);

  const connectedIp = state.status === 'connected' ? state.tv.ipAddress : null;

  /** User-initiated: also forgets the TV for auto-connect. */
  const disconnect = useCallback(() => {
    saveLastTvId(null);
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
      saveLastTvId(target.id);
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

  /** Queues one key request and records its result. Never retried automatically (AGENTS.md). */
  const sendCommand = useCallback(
    (target: CommandTarget, run: () => Promise<SendKeyResult>) => {
      enqueue(async () => {
        try {
          const result = await run();
          setLastCommand(
            result.httpStatus >= 200 && result.httpStatus < 300
              ? { target, ok: true, ...result }
              : { target, ok: false, code: 'unsupported', httpStatus: result.httpStatus },
          );
        } catch (error) {
          setLastCommand({ target, ok: false, code: toCode(error) });
        }
      });
    },
    [enqueue],
  );

  const sendKey = useCallback(
    (key: RemoteKey, options?: { skipIfBusy?: boolean }) => {
      if (!connectedIp) return;
      if (options?.skipIfBusy && pendingRef.current >= 2) return;
      sendCommand({ type: 'key', key }, () => sendSmartCenterKey({ ipAddress: connectedIp, key }));
    },
    [connectedIp, sendCommand],
  );

  const sendTestCode = useCallback(
    (code: number) => {
      if (!connectedIp) return;
      sendCommand({ type: 'code', code }, () => sendSmartCenterTestCode({ ipAddress: connectedIp, code }));
    },
    [connectedIp, sendCommand],
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
      // Only apps the TV reported can be launched: with the DIAL name it answered to, or a remote key.
      const app = apps.apps.find((a) => a.id === appId && a.installed);
      const { launchKey, dialName } = app ?? {};
      if (!launchKey && !dialName) return;
      enqueue(async () => {
        try {
          const result = launchKey
            ? await sendSmartCenterKey({ ipAddress: connectedIp, key: launchKey })
            : await launchDialApp({ ipAddress: connectedIp, dialName: dialName ?? '' });
          // Keys answer 200; DIAL answers 201 (started) or 200 (already running).
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

  // Auto-connect once on app start to the TV used last time (found by identity if its IP changed).
  // Remember the connected TV's apps for display while disconnected.
  useEffect(() => {
    loadLastTvApps().then((stored) => {
      if (stored) setLastTvApps((current) => current ?? stored);
    });
  }, []);
  const connectedTvId = state.status === 'connected' ? state.tv.id : null;
  useEffect(() => {
    if (!connectedTvId || apps.status !== 'ready') return;
    const value: LastTvApps = {
      tvId: connectedTvId,
      apps: apps.apps.filter((a) => a.installed).map(({ id, label }) => ({ id, label })),
    };
    setLastTvApps(value);
    saveLastTvApps(value);
  }, [connectedTvId, apps]);
  const lastTv = useMemo(() => {
    const tv = lastTvApps ? tvs.find((t) => t.id === lastTvApps.tvId) : undefined;
    return tv && lastTvApps ? { tv, apps: lastTvApps.apps } : null;
  }, [lastTvApps, tvs]);

  const autoConnectTriedRef = useRef(false);
  useEffect(() => {
    if (savedTvsStatus !== 'ready' || autoConnectTriedRef.current) return;
    autoConnectTriedRef.current = true;
    loadLastTvId().then((id) => {
      const tv = id ? tvs.find((t) => t.id === id) : undefined;
      if (tv) connect(tv);
    });
  }, [savedTvsStatus, tvs, connect]);

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
      sendTestCode,
      lastCommand,
      apps,
      refreshApps,
      launchApp,
      customAppIds,
      addApp,
      removeApp,
      lastTv,
    }),
    [
      state,
      connect,
      disconnect,
      sendKey,
      sendTestCode,
      lastCommand,
      apps,
      refreshApps,
      launchApp,
      customAppIds,
      addApp,
      removeApp,
      lastTv,
    ],
  );

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection() {
  const ctx = useContext(ConnectionContext);
  if (!ctx) throw new Error('useConnection must be used inside ConnectionProvider');
  return ctx;
}