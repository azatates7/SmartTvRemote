/**
 * TEMPORARY read-only diagnostics, run from Settings while connected. Remove this file and
 * `components/diagnostics-panel.tsx` once the open questions in docs/protocol-notes.md are answered.
 *
 * Answers, on the phone:
 *  - Does `:56789/apps/<name>` answer 200 for ANY name (catch-all)?
 *  - Where is the UPnP/DIAL device description (UDN, model, `Application-URL`)?
 *  - What do YouTube / Netflix report at the real `Application-URL`?
 *
 * Safety: GET only, private IPv4 only, every URL must point at the TV's own IP, short timeouts,
 * never retried. SSDP (UDP) is not available here, so description locations are probed by guessing.
 */

import { parsePrivateIPv4 } from '@/domain/ip-address';

const TIMEOUT_MS = 1200;
const SMART_CENTER = 56789;
const PORTS = [56789, 56790, 8080, 49152, 49153, 52235] as const;
const PATHS = [
  '/dd.xml',
  '/description.xml',
  '/rootDesc.xml',
  '/ssdp/device-desc.xml',
  '/dial/dd.xml',
  '/',
] as const;
const APPS = ['YouTube', 'Netflix'] as const;

type Result =
  | { ok: true; status: number; body: string; applicationUrl: string | null }
  | { ok: false; error: string };

async function get(url: string, tvIp: string, signal?: AbortSignal): Promise<Result> {
  // Only the TV itself, plain HTTP.
  const parsed = /^http:\/\/([0-9.]+)(?::(\d{1,5}))?(\/[^\s]*)?$/.exec(url);
  if (!parsed || parsed[1] !== tvIp) return { ok: false, error: 'blocked (not the TV)' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Connection: 'close' },
      signal: controller.signal,
    });
    const body = (await res.text()).slice(0, 1500);
    return { ok: true, status: res.status, body, applicationUrl: res.headers.get('Application-URL') };
  } catch {
    return { ok: false, error: controller.signal.aborted ? 'timeout' : 'connection failed' };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

const tag = (xml: string, name: string) =>
  new RegExp(`<${name}>\\s*([^<]*?)\\s*</${name}>`, 'i').exec(xml)?.[1];

const oneLine = (text: string, max = 300) => text.replace(/\s+/g, ' ').trim().slice(0, max);

function describe(r: Result): string {
  if (!r.ok) return r.error;
  const state = tag(r.body, 'state');
  return `HTTP ${r.status}${state ? ` · state=${state}` : ''}`;
}

/** Runs all checks, streaming each report line to `onLine`. Returns the full report. */
export async function runDiagnostics({
  ipAddress,
  onLine,
  signal,
}: {
  ipAddress: string;
  onLine: (line: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const lines: string[] = [];
  const out = (line: string) => {
    lines.push(line);
    onLine(line);
  };

  const ip = parsePrivateIPv4(ipAddress);
  if (!ip.ok) {
    out('Invalid TV address.');
    return lines.join('\n');
  }
  const tv = ip.value;
  const base = `http://${tv}:${SMART_CENTER}`;

  out(`SmartTvRemote diagnostics · ${new Date().toISOString()}`);
  out(`TV: ${tv}`);

  out('');
  out('[1] Smart Center');
  out(`  GET :${SMART_CENTER}/apps/SmartCenter → ${describe(await get(`${base}/apps/SmartCenter`, tv, signal))}`);

  out('');
  out('[2] Catch-all test (an app that cannot exist)');
  const fake = await get(`${base}/apps/NoSuchApp_9f3k2`, tv, signal);
  out(`  GET :${SMART_CENTER}/apps/NoSuchApp_9f3k2 → ${describe(fake)}`);
  if (fake.ok && fake.status >= 200 && fake.status < 300) {
    out('  ⇒ CATCH-ALL: :56789/apps/<name> answers for any name; not usable to detect or open apps.');
  }

  out('');
  out('[3] Device description search (UDN / model / Application-URL)');
  const appUrls = new Set<string>();
  for (const port of PORTS) {
    if (signal?.aborted) break;
    for (const path of PATHS) {
      const r = await get(`http://${tv}:${port}${path}`, tv, signal);
      if (!r.ok) {
        out(`  :${port}${path} → ${r.error}${path === PATHS[0] ? ' (port skipped)' : ''}`);
        if (path === PATHS[0]) break; // port closed / filtered: skip its other paths
        continue;
      }
      const udn = tag(r.body, 'UDN');
      const isDescription = !!udn || r.applicationUrl !== null;
      if (!isDescription) {
        out(`  :${port}${path} → HTTP ${r.status}`);
        continue;
      }
      out(`  FOUND :${port}${path} → HTTP ${r.status}`);
      if (r.applicationUrl) {
        out(`    Application-URL: ${r.applicationUrl}`);
        appUrls.add(r.applicationUrl);
      }
      if (udn) out(`    UDN: ${udn}`);
      for (const name of ['friendlyName', 'manufacturer', 'modelName', 'modelNumber']) {
        const value = tag(r.body, name);
        if (value) out(`    ${name}: ${value}`);
      }
      out(`    body: ${oneLine(r.body)}`);
    }
  }
  if (appUrls.size === 0) out('  No description with UDN / Application-URL found at these locations.');

  out('');
  out(`[4] Apps via :${SMART_CENTER}/apps/`);
  for (const app of APPS) {
    out(`  ${app} → ${describe(await get(`${base}/apps/${app}`, tv, signal))}`);
  }

  for (const appUrl of appUrls) {
    out('');
    out(`[5] Apps via Application-URL ${appUrl}`);
    const prefix = appUrl.endsWith('/') ? appUrl : `${appUrl}/`;
    for (const app of APPS) {
      const r = await get(`${prefix}${app}`, tv, signal);
      out(`  ${app} → ${describe(r)}`);
      if (r.ok && r.status < 300) out(`    body: ${oneLine(r.body, 200)}`);
    }
  }

  out('');
  out('Done.');
  return lines.join('\n');
}