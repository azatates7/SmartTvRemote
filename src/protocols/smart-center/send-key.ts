/**
 * Key sending for Smart Center TVs: `POST /apps/SmartCenter` with an XML key body.
 *
 * Body format verified on TV-001 (2026-11-18): unquoted code, `<remote><key code=1016 /></remote>`.
 * Key codes come from community sources; see docs/compatibility.md for which are verified.
 * Power is mapped, but the UI must confirm before sending it.
 */

import type { RemoteKey } from '@/domain/tv';

import { smartCenterRequest } from './http';

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
  exit: 1037,
  play: 1025,
  stop: 1049,
  power: 1012, // 3 sources; disruptive — UI asks for confirmation, never retried
  digit0: 1000,
  digit1: 1001,
  digit2: 1002,
  digit3: 1003,
  digit4: 1004,
  digit5: 1005,
  digit6: 1006,
  digit7: 1007,
  digit8: 1008,
  digit9: 1009,
};

const KEY_TIMEOUT_MS = 3000;

export function buildKeyBody(code: number): string {
  return `<remote><key code=${code} /></remote>`;
}

export type SendKeyResult = { httpStatus: number; elapsedMs: number };

export async function sendSmartCenterKey({
  ipAddress,
  key,
  signal,
  fetchImpl,
}: {
  ipAddress: string;
  key: RemoteKey;
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
    body: buildKeyBody(code),
    contentType: 'application/xml',
    timeoutMs: KEY_TIMEOUT_MS,
    signal,
    fetchImpl,
  });

  return { httpStatus: response.httpStatus, elapsedMs: response.elapsedMs };
}