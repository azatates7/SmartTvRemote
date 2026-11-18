/**
 * App launching via DIAL (the TV runs a DIAL 2.2 server, see docs/compatibility.md TV-001).
 * Verified on TV-001 (2026-11-18): Netflix and Prime Video (`AmazonInstantVideo`) launch with 201;
 * YouTube answers 403 (the TV does not allow launching it over DIAL); unknown names answer 404.
 *
 * DIAL REST: `GET /apps/<name>` returns the app's status XML (404 = not installed, no side effects);
 * `POST /apps/<name>` launches it (201 Created when started). YouTube / Netflix / Prime Video use public
 * DIAL registry names. TOD has no published DIAL name, so a few likely names are tried in order (GET only);
 * whichever answers 200 is used to launch. Whether this TV exposes any of them is verified at runtime.
 */

import { smartCenterRequest } from './http';

/** Stable app id inside this app (built-in ids, catalog ids, or `custom:<dialName>`). */
export type DialAppId = string;

/** DIAL app names the app may request: same rule as the HTTP path guard. */
const DIAL_NAME = /^[A-Za-z0-9._-]{1,64}$/;

export function isValidDialName(name: string): boolean {
  return DIAL_NAME.test(name);
}

export type DialAppDefinition = {
  id: DialAppId;
  /** Display name only — no third-party logos are bundled. */
  label: string;
  /** DIAL names to try, in order. */
  dialNames: readonly string[];
};

/** Apps checked automatically on every connection. */
export const DIAL_APPS: readonly DialAppDefinition[] = [
  { id: 'YouTube', label: 'YouTube', dialNames: ['YouTube'] },
  { id: 'Netflix', label: 'Netflix', dialNames: ['Netflix'] },
  { id: 'AmazonInstantVideo', label: 'Prime Video', dialNames: ['AmazonInstantVideo'] },
  // Unverified guesses: no public DIAL name found for TOD (2026-11-16).
  { id: 'TOD', label: 'TOD', dialNames: ['TOD', 'TODTV', 'TOD_TV', 'tod'] },
];

export type DialAppStatus = {
  id: DialAppId;
  label: string;
  installed: boolean;
  /** The TV knows the app but refuses DIAL access to it (HTTP 403). */
  restricted?: boolean;
  /** The DIAL name that answered 200; used to launch. */
  dialName?: string;
  /** `<state>` from DIAL XML, e.g. "running", "stopped". */
  state?: string;
  httpStatus: number;
};

const STATUS_TIMEOUT_MS = 2500;
const LAUNCH_TIMEOUT_MS = 5000;

function readState(xml: string): string | undefined {
  return /<state>([^<]*)<\/state>/i.exec(xml)?.[1]?.trim() || undefined;
}

/** Tries each DIAL name of the app (read-only GETs) and returns the first one the TV knows. */
export async function getDialAppStatus({
  ipAddress,
  app,
  signal,
  fetchImpl,
}: {
  ipAddress: string;
  app: DialAppDefinition;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<DialAppStatus> {
  let lastStatus = 0;
  let restricted = false;
  for (const dialName of app.dialNames) {
    const response = await smartCenterRequest({
      ipAddress,
      method: 'GET',
      path: `/apps/${dialName}`,
      timeoutMs: STATUS_TIMEOUT_MS,
      signal,
      fetchImpl,
    });
    lastStatus = response.httpStatus;
    if (response.httpStatus === 403) restricted = true;
    if (response.httpStatus >= 200 && response.httpStatus < 300) {
      return {
        id: app.id,
        label: app.label,
        installed: true,
        dialName,
        state: readState(response.text),
        httpStatus: response.httpStatus,
      };
    }
  }
  return {
    id: app.id,
    label: app.label,
    installed: false,
    restricted: restricted || undefined,
    httpStatus: restricted ? 403 : lastStatus,
  };
}

/** DIAL: 201 = started, 200 = already running. Anything else means the TV did not open the app. */
export function isLaunchAccepted(httpStatus: number): boolean {
  return httpStatus === 200 || httpStatus === 201;
}

/** Starts the app on the TV. User-initiated only; never retried. */
export async function launchDialApp({
  ipAddress,
  dialName,
  signal,
  fetchImpl,
}: {
  ipAddress: string;
  /** Resolved DIAL name from `getDialAppStatus`. */
  dialName: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}): Promise<{ httpStatus: number; elapsedMs: number }> {
  const response = await smartCenterRequest({
    ipAddress,
    method: 'POST',
    path: `/apps/${dialName}`,
    body: '',
    contentType: 'text/plain; charset=utf-8',
    timeoutMs: LAUNCH_TIMEOUT_MS,
    signal,
    fetchImpl,
  });
  return { httpStatus: response.httpStatus, elapsedMs: response.elapsedMs };
}