/**
 * Key sending for Smart Center TVs: `POST /apps/SmartCenter` with an XML key body.
 *
 * Body and Content-Type match the official app (PCAPdroid capture on TV-001, 2026-11-18):
 *   `<?xml version='1.0' ?><remote><key code='1048'/></remote>`, `text/plain; charset=ISO-8859-1`.
 * The older unquoted form (`<remote><key code=1016 /></remote>`) also worked on TV-001.
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
  home: 1048, // official app sent 1048 in the 2026-11-18 capture; another source says 1046
  exit: 1037,
  play: 1025,
  stop: 1049,
  power: 1012, // 3 sources; disruptive — UI asks for confirmation, never retried
  menu: 1066,
  source: 1056,
  youtube: 1062, // verified on TV-001 (2026-11-20): opens YouTube; one source called it "favorites"
  // Verified on TV-001 with the code tester (2026-11-21):
  lastChannel: 1034, // back to the previous channel
  teletext: 1060,
  guide: 1047, // TV's own programme guide (EPG)
  disneyPlus: 1077, // opens Disney+
  tabii: 1080, // opens tabii
  portal: 1065, // "internet" key in one source: opens the TV's Smart / portal screen
  previous: 1027, // pyvesteltv: previous track in media playback
  next: 1028, // pyvesteltv: next track in media playback
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
const KEY_CONTENT_TYPE = 'text/plain; charset=ISO-8859-1';

export function buildKeyBody(code: number): string {
  return `<?xml version='1.0' ?><remote><key code='${code}'/></remote>`;
}

export type SendKeyResult = { httpStatus: number; elapsedMs: number };

/**
 * Code tester (kept as a feature for other TV models): lets the user try unknown key codes.
 * Any 4-digit code (1000–9999): codes seen so far are 1000–1082, but higher ones may exist.
 * Power (1012) is excluded: it can turn the TV off, and the remote already has a power button with a confirmation.
 */
export const TEST_CODE_MIN = 1000;
export const TEST_CODE_MAX = 9999;
const BLOCKED_TEST_CODES: ReadonlySet<number> = new Set([SMART_CENTER_KEY_CODES.power!]);

export function isTestableCode(code: number): boolean {
  return (
    Number.isInteger(code) &&
    code >= TEST_CODE_MIN &&
    code <= TEST_CODE_MAX &&
    !BLOCKED_TEST_CODES.has(code)
  );
}

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
  return postKeyCode({ ipAddress, code, signal, fetchImpl });
}

/** Sends a raw code from the code tester. Rejects codes outside the allowed range (and power). */
export async function sendSmartCenterTestCode({
  ipAddress,
  code,
  signal,
  fetchImpl,
}: {
  ipAddress: string;
  code: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<SendKeyResult> {
  if (!isTestableCode(code)) throw new Error(`Code ${code} is not allowed in the tester`);
  return postKeyCode({ ipAddress, code, signal, fetchImpl });
}

async function postKeyCode({
  ipAddress,
  code,
  signal,
  fetchImpl,
}: {
  ipAddress: string;
  code: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<SendKeyResult> {
  const response = await smartCenterRequest({
    ipAddress,
    method: 'POST',
    body: buildKeyBody(code),
    contentType: KEY_CONTENT_TYPE,
    timeoutMs: KEY_TIMEOUT_MS,
    signal,
    fetchImpl,
  });

  return { httpStatus: response.httpStatus, elapsedMs: response.elapsedMs };
}