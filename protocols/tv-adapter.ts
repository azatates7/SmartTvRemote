import type { DiscoveredTv, RemoteKey, TvCapability, TvConnection } from '../domain/tv';

/**
 * Boundary between the app and a TV platform protocol (AGENTS.md §3.3).
 *
 * Rules for implementations:
 * - Keep HTTP/XML, ports and vendor key codes inside the adapter.
 * - Throw `TvError` with a stable `code`; never leak secrets in messages.
 * - Report only capabilities verified for the connected model (docs/compatibility.md).
 * - Never auto-retry non-idempotent keys (e.g. power).
 *
 * No implementation exists yet: the first adapter is blocked on the Phase 0 TV test.
 * Optional guide/apps methods will be added when Phase 3/4 starts.
 */
export interface TvAdapter {
  readonly id: string;
  discover(signal?: AbortSignal): Promise<DiscoveredTv[]>;
  connect(tv: DiscoveredTv, signal?: AbortSignal): Promise<TvConnection>;
  disconnect(): Promise<void>;
  getCapabilities(): ReadonlySet<TvCapability>;
  sendKey(key: RemoteKey, signal?: AbortSignal): Promise<void>;
}