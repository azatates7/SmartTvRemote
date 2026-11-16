/**
 * EXPERIMENTAL key sending for Smart Center TVs: `POST /apps/SmartCenter` with an XML key body.
 *
 * Key codes and body format come from community sources and are NOT yet verified on a real TV
 * (docs/protocol-notes.md §3–4). Sources disagree on quoting, so the format is selectable until
 * testing settles it. Power (1012) is intentionally absent: it needs a confirmation flow first.
 */

import type { RemoteKey } from '@/domain/tv';

import { smartCenterRequest } from './http';

export type KeyBodyFormat = 'unquoted' | 'quoted';

/**
 * Logical key → vendor code. Only keys listed here are offered by the UI.
 * "3 sources" = same code in three independent community sources; others come from one source.
 */
export const SMART_CENTER_KEY_CODES: Partial<Record<RemoteKey, number>> = {
  volumeUp: 1016, // 3 sources
  volumeDown: 1017, // 3 sources
  mute: 1013, // 3 sources
  channelUp: 1032, // 3 sources
  channelDown: 1033, // 3 sources
  up: 1020,
  down: 1019,
  left: 1021,
  right: 1022,
  ok: 1053,
  back: 1010,
  home: 1048, // conflict: another source says 1046
};

const KEY_TIMEOUT_MS = 3000;

export function buildKeyBody(code: number, format: KeyBodyFormat): string {
  return format === 'unquoted'
    ? `<remote><key code=${code} /></remote>`
    : `<?xml version="1.0" ?><remote><key code="${code}"/></remote>`;
}

export type SendKeyResult = { httpStatus: number; elapsedMs: number };

export async function sendSmartCenterKey({
  ipAddress,
  key,
  format,
  signal,
  fetchImpl,
}: {
  ipAddress: string;
  key: RemoteKey;
  format: KeyBodyFormat;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<SendKeyResult> {
  const code = SMART_CENTER_KEY_CODES[key];
  if (code === undefined) {
    // Caller bug: the UI should only offer mapped keys.
    throw new Error(`No Smart Center code for key "${key}"`);
  }

  const response = await smartCenterRequest({
    ipAddress,
    method: 'POST',
    body: buildKeyBody(code, format),
    contentType: 'application/xml',
    timeoutMs: KEY_TIMEOUT_MS,
    signal,
    fetchImpl,
  });

  return { httpStatus: response.httpStatus, elapsedMs: response.elapsedMs };
}