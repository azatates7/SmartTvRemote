/**
 * Read-only probe for Toshiba / Vestel Smart Center TVs.
 *
 * Sends a single `GET http://<ip>:56789/apps/SmartCenter`, which returns DIAL application-status XML
 * with no side effects on the TV. Verified on one TV (docs/compatibility.md, TV-001): HTTP 200,
 * `<name>SmartCenter</name>`, `<state>running</state>`, DIAL 2.2.
 * A response only means "the Smart Center service answered"; individual keys are verified separately.
 */

import { smartCenterRequest } from './http';

export { SMART_CENTER_PORT } from './http';

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
  /** Raw body, truncated. */
  body: string;
};

type ProbeOptions = {
  ipAddress: string;
  port?: number;
  timeoutMs?: number;
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
  port,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal,
  fetchImpl,
}: ProbeOptions): Promise<SmartCenterProbeResult> {
  const response = await smartCenterRequest({
    ipAddress,
    method: 'GET',
    port,
    timeoutMs,
    signal,
    fetchImpl,
  });
  const body = response.text.slice(0, MAX_BODY_CHARS);

  return {
    url: response.url,
    httpStatus: response.httpStatus,
    elapsedMs: response.elapsedMs,
    appName: readTag(body, 'name'),
    appState: readTag(body, 'state'),
    body,
  };
}

export function isSmartCenterRunning(result: SmartCenterProbeResult): boolean {
  return result.httpStatus >= 200 && result.httpStatus < 300;
}