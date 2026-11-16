/**
 * Single HTTP request to a Smart Center TV with the safety rules from AGENTS.md:
 * private IPv4 only, bounded timeout, `Connection: close`, never retried.
 * Low-level failures are mapped to stable `TvError` codes.
 */

import { parsePrivateIPv4 } from '@/domain/ip-address';
import { TvError } from '@/domain/tv';

export const SMART_CENTER_PORT = 56789;
export const SMART_CENTER_PATH = '/apps/SmartCenter';

export type SmartCenterRequest = {
  ipAddress: string;
  method: 'GET' | 'POST';
  body?: string;
  contentType?: string;
  port?: number;
  timeoutMs: number;
  /** Caller cancellation, e.g. when the screen unmounts. */
  signal?: AbortSignal;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
};

export type SmartCenterResponse = {
  url: string;
  httpStatus: number;
  elapsedMs: number;
  text: string;
};

export async function smartCenterRequest({
  ipAddress,
  method,
  body,
  contentType,
  port = SMART_CENTER_PORT,
  timeoutMs,
  signal,
  fetchImpl = fetch,
}: SmartCenterRequest): Promise<SmartCenterResponse> {
  const ip = parsePrivateIPv4(ipAddress);
  if (!ip.ok) throw new TvError('invalidAddress');

  const url = `http://${ip.value}:${port}${SMART_CENTER_PATH}`;
  if (signal?.aborted) throw new TvError('cancelled');

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener('abort', onCallerAbort);

  const headers: Record<string, string> = { Connection: 'close' };
  if (contentType) headers['Content-Type'] = contentType;

  const startedAt = Date.now();
  try {
    const response = await fetchImpl(url, { method, headers, body, signal: controller.signal });
    const text = await response.text();
    return { url, httpStatus: response.status, elapsedMs: Date.now() - startedAt, text };
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