/**
 * Reads the TV's stable identity (UPnP/DIAL device description → `<UDN>`), so a saved TV is
 * recognised even after DHCP gives it a new IP address.
 *
 * The description's real URL is normally announced via SSDP (UDP), which this app does not use.
 * Instead a few common locations are tried with read-only GETs. If none answers with a UDN the
 * TV simply has no identity in the app, and IP-change handling falls back to asking the user.
 * Run `scripts/tv-explore.py` to see the TV's real description URL and adjust CANDIDATES.
 */

import type { DeviceIdentity } from '@/domain/tv';

import { DEVICE_DESCRIPTION_PATHS, SMART_CENTER_PORT, smartCenterRequest } from './http';

type Candidate = { port: number; path: (typeof DEVICE_DESCRIPTION_PATHS)[number] };

/**
 * Tried in order. `:56790/dd.xml` is verified on TV-001 (Toshiba 50UL2163DT, Vestel MB180, 2026-11-18);
 * the others are fallbacks for models not tested yet.
 */
const CANDIDATES: readonly Candidate[] = [
  { port: 56790, path: '/dd.xml' },
  { port: SMART_CENTER_PORT, path: '/dd.xml' },
  { port: 56790, path: '/description.xml' },
  { port: 56790, path: '/' },
];

const TIMEOUT_MS = 1500;

function readTag(xml: string, tag: string): string | undefined {
  return new RegExp(`<${tag}>\\s*([^<]*?)\\s*</${tag}>`, 'i').exec(xml)?.[1] || undefined;
}

/** Extracts identity from a device-description XML. Exported for tests. */
export function parseDeviceDescription(xml: string): DeviceIdentity | null {
  const udn = readTag(xml, 'UDN');
  // A UDN is "uuid:" + an id; anything else is not a usable identity.
  if (!udn || !/^uuid:[A-Za-z0-9-]{8,}$/i.test(udn)) return null;
  return {
    deviceId: udn.toLowerCase(),
    friendlyName: readTag(xml, 'friendlyName'),
    model: readTag(xml, 'modelName'),
    manufacturer: readTag(xml, 'manufacturer'),
  };
}

/** Returns the TV's identity, or null if it could not be read. Never throws. */
export async function fetchDeviceIdentity({
  ipAddress,
  signal,
  fetchImpl,
}: {
  ipAddress: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<DeviceIdentity | null> {
  for (const { port, path } of CANDIDATES) {
    if (signal?.aborted) return null;
    try {
      const response = await smartCenterRequest({
        ipAddress,
        method: 'GET',
        port,
        path,
        timeoutMs: TIMEOUT_MS,
        signal,
        fetchImpl,
      });
      if (response.httpStatus >= 200 && response.httpStatus < 300) {
        const identity = parseDeviceDescription(response.text);
        if (identity) return identity;
      }
    } catch {
      // Port closed / timeout: try the next location.
    }
  }
  return null;
}