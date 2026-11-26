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

import { parsePrivateIPv4 } from '@/domain/ip-address';
import { TvError, type RemoteKey, type SavedTv, type TvErrorCode } from '@/domain/tv';
import { macFromDeviceId, subnetBroadcast } from '@/domain/wake';
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
import { discoverSmartCenterTvs, getPhoneIpOnLan } from '@/protocols/smart-center/discover';
import {
  isSmartCenterRunning,
  probeSmartCenter,
  type SmartCenterProbeResult,
} from '@/protocols/smart-center/probe';
import { sendSmartCenterKey, sendSmartCenterTestCode, type SendKeyResult } from '@/protocols/smart-center/send-key';

import { isWakeOnLanAvailable, sendMagicPacket } from '../../modules/wake-on-lan';
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
  | { status: 'connecting'; tv: SavedTv; searching?: boolean; waking?: boolean }
  | { status: 'connected'; tv: SavedTv; probe: SmartCenterProbeResult }
  | { status: 'error'; tv: SavedTv; code: TvErrorCode; wake?: WakeReport };

/**
 * "TV'yi aç" denemesinin ayrıntıları; hata olursa kullanıcıya hangi adımda takıldığını göstermek için tutulur.
 * `failedStep`: `network` telefon Wi-Fi'da değil, `send` paket gönderilemedi, `notFound` paket gitti ama TV ağda görünmedi.
 */
export type WakeReport = {
  mac: string;
  /** Paketin gönderildiği adresler (ağ yayını, genel yayın, TV'nin son IP adresi). */
  targets: string[];
  /** Tüm adreslere kaç tur paket gönderildiği. */
  rounds: number;
  /** TV'nin eski adresinde Smart Center'ın açılması için kaç saniye beklendiği. */
  waitedSeconds: number;
  failedStep?: 'network' | 'send' | 'notFound';
  /** Yerel modülden gelen hata mesajı (yalnızca `send` adımında). */
  message?: string;
};

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
  connect: (tv: SavedTv, options?: ConnectOptions) => Promise<void>;
  disconnect: () => void;
  /** TV kapalıyken (bekleme modunda) Wake-on-LAN ile açıp bağlanır; yalnızca `canWake(tv)` true ise kullanılmalı. */
  wake: (tv: SavedTv) => Promise<void>;
  /** Bu TV bu telefondan açılabilir mi: Android'de yerel modül var ve TV'nin kimliğinden MAC adresi okunabiliyor. */
  canWake: (tv: SavedTv) => boolean;
  /** `skipIfBusy`: drop the press if the TV still has requests queued (used for held-key repeat). */
  sendKey: (key: RemoteKey, options?: { skipIfBusy?: boolean }) => void;
  /** Code tester: sends a raw code; only codes allowed by `isTestableCode`. */
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

/** `connect` seçenekleri; "TV'yi aç" akışı bağlantı başarısız olursa kendi hata kodunu ve ayrıntılarını göstermek için kullanır. */
export type ConnectOptions = { failureCode?: TvErrorCode; wakeReport?: WakeReport };

/** Sihirli paket kaç kez ve hangi aralıkla gönderilir; Wi-Fi ile uyandırmada tek paket kaçabildiği için birkaç kez gönderiyoruz. */
const WAKE_PACKET_REPEATS = 3;
const WAKE_PACKET_GAP_MS = 1000;
/** TV'nin açılıp Smart Center'ı başlatması için beklenen en uzun süre ve bu sürede TV'nin kaç saniyede bir yoklandığı. */
const WAKE_TIMEOUT_MS = 40_000;
const WAKE_POLL_MS = 3000;
/** TV cevap verip Smart Center henüz hazır değilse kaç kez ve hangi aralıkla yeniden denendiği (toplam yaklaşık 8 sn). */
const NOT_READY_RETRIES = 4;
const NOT_READY_DELAY_MS = 2000;

/** Belirtilen süre kadar bekler; işlem iptal edilirse `cancelled` hatasıyla hemen biter. */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new TvError('cancelled'));
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new TvError('cancelled'));
      },
      { once: true },
    );
  });
}

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

  const connect = useCallback(async (tv: SavedTv, options?: ConnectOptions) => {
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
      let probe = await probeSmartCenter({ ipAddress: tv.ipAddress, signal });
      // TV yeni açıldıysa ağa bağlanmış ama Smart Center servisi henüz başlamamış olabilir; hemen hata vermek yerine birkaç kez yeniden deniyoruz.
      for (let i = 0; i < NOT_READY_RETRIES && !isSmartCenterRunning(probe); i++) {
        await delay(NOT_READY_DELAY_MS, signal);
        probe = await probeSmartCenter({ ipAddress: tv.ipAddress, signal });
      }
      if (signal.aborted) return;
      if (isSmartCenterRunning(probe)) await markConnected(tv, probe);
      else setState({ status: 'error', tv, code: 'unsupported', wake: options?.wakeReport });
      return;
    } catch (error) {
      const code = toCode(error);
      if (code === 'cancelled') return;
      // Wrong / changed address and the TV has a known identity: look for it on the network.
      if (!tv.deviceId || (code !== 'unreachable' && code !== 'timeout')) {
        setState({ status: 'error', tv, code, wake: options?.wakeReport });
        return;
      }
    }

    setState({ status: 'connecting', tv, searching: true });
    try {
      const found = await discoverSmartCenterTvs({ signal });
      if (signal.aborted) return;
      const match = found.find((f) => f.identity?.deviceId === tv.deviceId);
      if (!match) {
        setState({
          status: 'error',
          tv,
          code: options?.failureCode ?? 'unreachable',
          wake: options?.wakeReport && { ...options.wakeReport, failedStep: 'notFound' },
        });
        return;
      }
      const moved = updateTv(tv.id, { ipAddress: match.ipAddress }) ?? { ...tv, ipAddress: match.ipAddress };
      await markConnected(moved, match.probe);
    } catch (error) {
      const code = toCode(error);
      if (code !== 'cancelled') {
        setState({ status: 'error', tv, code: code === 'unknown' ? 'unreachable' : code, wake: options?.wakeReport });
      }
    }
  }, [updateTv]);

  const canWake = useCallback((tv: SavedTv) => isWakeOnLanAvailable && macFromDeviceId(tv.deviceId) !== null, []);

  /**
   * TV'yi Wake-on-LAN ile açar ve ardından bağlanır.
   * Sihirli paket telefonun ağının yayın adresine, genel yayın adresine ve TV'nin son bilinen IP adresine birkaç kez gönderilir, çünkü Wi-Fi ile uyandırmada ilk paket kaçabilir.
   * Sonra TV'nin eski adresinde Smart Center açılana kadar en fazla WAKE_TIMEOUT_MS boyunca beklenir; açılınca normal bağlantı akışı çalışır.
   * Süre dolarsa TV'nin IP adresi değişmiş olabileceği için ağ kimlikle bir kez taranır; yine bulunamazsa hata `wakeFailed` olur.
   */
  const wake = useCallback(
    async (tv: SavedTv) => {
      const mac = macFromDeviceId(tv.deviceId);
      if (!mac || !isWakeOnLanAvailable) return;
      connectAbortRef.current?.abort();
      const controller = new AbortController();
      connectAbortRef.current = controller;
      const { signal } = controller;
      setState({ status: 'connecting', tv, waking: true });
      setLastCommand(null);
      setApps({ status: 'idle' });

      const report: WakeReport = { mac, targets: [], rounds: 0, waitedSeconds: 0 };
      const fail = (code: TvErrorCode, step: WakeReport['failedStep'], message?: string) => {
        if (!signal.aborted) setState({ status: 'error', tv, code, wake: { ...report, failedStep: step, message } });
      };

      // 1. Telefonun ağını bul: paket bu ağın yayın adresine gider.
      let phoneIp: string;
      try {
        const phone = parsePrivateIPv4(await getPhoneIpOnLan());
        if (!phone.ok) throw new TvError('networkUnavailable');
        phoneIp = phone.value;
      } catch (error) {
        if (toCode(error) !== 'cancelled') fail('networkUnavailable', 'network');
        return;
      }
      report.targets = [subnetBroadcast(phoneIp), '255.255.255.255', tv.ipAddress];

      // 2. Paketi birkaç tur gönder.
      try {
        for (let i = 0; i < WAKE_PACKET_REPEATS; i++) {
          await sendMagicPacket(mac, report.targets);
          report.rounds++;
          await delay(WAKE_PACKET_GAP_MS, signal);
        }
      } catch (error) {
        if (toCode(error) === 'cancelled') return;
        if (report.rounds === 0) {
          fail('wakeFailed', 'send', error instanceof Error ? error.message : String(error));
          return;
        }
      }

      // 3. TV'nin eski adresinde Smart Center açılana kadar bekle.
      const started = Date.now();
      try {
        while (Date.now() - started < WAKE_TIMEOUT_MS) {
          const probe = await probeSmartCenter({ ipAddress: tv.ipAddress, signal }).catch(() => null);
          if (signal.aborted) return;
          if (probe && isSmartCenterRunning(probe)) break;
          await delay(WAKE_POLL_MS, signal);
        }
      } catch {
        return; // yalnızca iptal (cancelled) buraya düşer
      }
      report.waitedSeconds = Math.round((Date.now() - started) / 1000);

      // 4. TV açıldıysa bağlantı hemen kurulur; açılmadıysa connect ağı kimlikle tarar, bulamazsa ayrıntılı `wakeFailed` gösterir.
      await connect(tv, { failureCode: 'wakeFailed', wakeReport: report });
    },
    [connect],
  );

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
      wake,
      canWake,
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
      wake,
      canWake,
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