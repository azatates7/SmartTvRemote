/**
 * EXPERIMENTAL read-only probe for Toshiba / Vestel Smart Center TVs.
 *
 * Sends a single `GET http://<ip>:56789/apps/SmartCenter`, which community sources report to
 * return DIAL application-status XML with no side effects on the TV (docs/protocol-notes.md §3).
 * A response only means "something answered"; it does NOT prove the TV is supported.
 *
 * Rules (AGENTS.md): private IPv4 only, bounded timeout, exactly one request, never retried.
 */

import { parsePrivateIPv4 } from '@/domain/ip-address';
import { TvError } from '@/domain/tv';

export const SMART_CENTER_PORT = 56789;
const DEFAULT_TIMEOUT_MS = 3000;
const MAX_BODY_CHARS = 2000;

export type SmartCenterProbeResult = {
  url: string;
  httpStatus: number;
  elapsedMs: number;
  /** `<name>` from DIAL status XML, if present. */
  appName?: string;
  /** `<state>` from DIAL status XML (e.g. "running", "stopped"), if present. */
  appState?: string;
  /** Raw body, truncated. Shown to the user so it can be copied into docs/compatibility.md. */
  body: string;
};

type ProbeOptions = {
  ipAddress: string;
  port?: number;
  timeoutMs?: number;
  /** Caller cancellation, e.g. when the screen unmounts. */
  signal?: AbortSignal;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
};

function readTag(xml: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i').exec(xml);
  const value = match?.[1]?.trim();
  return value ? value : undefined;
}

export async function probeSmartCenter({
  ipAddress,
  port = SMART_CENTER_PORT,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal,
  fetchImpl = fetch,
}: ProbeOptions): Promise<SmartCenterProbeResult> {
  const ip = parsePrivateIPv4(ipAddress);
  if (!ip.ok) throw new TvError('invalidAddress');

  const url = `http://${ip.value}:${port}/apps/SmartCenter`;

  if (signal?.aborted) throw new TvError('cancelled');

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener('abort', onCallerAbort);

  const startedAt = Date.now();
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Connection: 'close' },
      signal: controller.signal,
    });
    const body = (await response.text()).slice(0, MAX_BODY_CHARS);

    return {
      url,
      httpStatus: response.status,
      elapsedMs: Date.now() - startedAt,
      appName: readTag(body, 'name'),
      appState: readTag(body, 'state'),
      body,
    };
  } catch (error) {
    if (timedOut) throw new TvError('timeout', undefined, { cause: error });
    if (signal?.aborted) throw new TvError('cancelled', undefined, { cause: error });
    // fetch rejects with a generic TypeError for refused connections, unknown hosts, no Wi-Fi, etc.
    throw new TvError('unreachable', undefined, { cause: error });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onCallerAbort);
  }
}