/**
 * EXPERIMENTAL same-network discovery for Smart Center TVs (docs/protocol-notes.md §5, option B).
 *
 * Takes the phone's own Wi-Fi IPv4, assumes a /24 home network (e.g. 192.168.1.x) and sends the
 * read-only probe (`GET :56789/apps/SmartCenter`) to every other host, a few at a time.
 * No UDP / multicast, so no native module and no iOS multicast entitlement are needed.
 *
 * Limits: networks larger than /24 are only partly scanned; guest Wi-Fi / client isolation hides the TV.
 */

import * as Network from 'expo-network';

import { parsePrivateIPv4 } from '@/domain/ip-address';
import { TvError, type DeviceIdentity } from '@/domain/tv';

import { fetchDeviceIdentity } from './device-info';
import { probeSmartCenter, type SmartCenterProbeResult } from './probe';

const CONCURRENCY = 32;
const PER_HOST_TIMEOUT_MS = 1200;

export type DiscoveredSmartCenter = {
  ipAddress: string;
  probe: SmartCenterProbeResult;
  /** Stable identity if the TV exposes one (read only for TVs that answered). */
  identity: DeviceIdentity | null;
};

export type DiscoveryProgress = { scanned: number; total: number };

type DiscoverOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: DiscoveryProgress) => void;
  /** Called as soon as a TV answers, so the UI can show it before the scan finishes. */
  onFound?: (tv: DiscoveredSmartCenter) => void;
  /** Injected for tests. */
  getPhoneIp?: () => Promise<string>;
  probe?: typeof probeSmartCenter;
  identify?: typeof fetchDeviceIdentity;
};

/** Returns the phone's private IPv4 on Wi-Fi/Ethernet, or throws `networkUnavailable`. */
async function getPhoneIpOnLan(): Promise<string> {
  const state = await Network.getNetworkStateAsync();
  const onLan =
    state.isConnected &&
    (state.type === Network.NetworkStateType.WIFI ||
      state.type === Network.NetworkStateType.ETHERNET);
  if (!onLan) throw new TvError('networkUnavailable');
  return Network.getIpAddressAsync();
}

export async function discoverSmartCenterTvs({
  signal,
  onProgress,
  onFound,
  getPhoneIp = getPhoneIpOnLan,
  probe = probeSmartCenter,
  identify = fetchDeviceIdentity,
}: DiscoverOptions = {}): Promise<DiscoveredSmartCenter[]> {
  const phone = parsePrivateIPv4(await getPhoneIp());
  // getIpAddressAsync returns "0.0.0.0" or a public/cellular address when not on a home LAN.
  if (!phone.ok) throw new TvError('networkUnavailable');

  const [a, b, c, own] = phone.value.split('.').map(Number);
  const candidates: string[] = [];
  for (let host = 1; host <= 254; host++) {
    if (host !== own) candidates.push(`${a}.${b}.${c}.${host}`);
  }

  const found: DiscoveredSmartCenter[] = [];
  let next = 0;
  let scanned = 0;
  onProgress?.({ scanned, total: candidates.length });

  const worker = async () => {
    while (next < candidates.length) {
      if (signal?.aborted) return;
      const ipAddress = candidates[next++];
      try {
        const result = await probe({ ipAddress, timeoutMs: PER_HOST_TIMEOUT_MS, signal });
        if (result.httpStatus >= 200 && result.httpStatus < 300) {
          const identity = await identify({ ipAddress, signal });
          const tv = { ipAddress, probe: result, identity };
          found.push(tv);
          onFound?.(tv);
        }
      } catch {
        // No TV at this address (timeout / refused) — expected for almost every host.
      }
      scanned++;
      onProgress?.({ scanned, total: candidates.length });
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (signal?.aborted) throw new TvError('cancelled');

  return found.sort((x, y) => Number(x.ipAddress.split('.')[3]) - Number(y.ipAddress.split('.')[3]));
}