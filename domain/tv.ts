/**
 * Platform-independent TV domain types. No protocol details (ports, XML, vendor codes) belong here.
 * Guide/app types are intentionally absent until Phase 3/4 needs them.
 */

/** A feature the connected TV is known (verified) to support. The UI shows only what is in this set. */
export type TvCapability =
  | 'power'
  | 'navigation'
  | 'volume'
  | 'mute'
  | 'channel'
  | 'numericKeypad'
  | 'mediaPlayback'
  | 'channelList'
  | 'programGuide'
  | 'installedApps'
  | 'launchApp';

/** Logical remote keys. Adapters map these to vendor codes; the UI never sees codes. */
export type RemoteKey =
  | 'power'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'ok'
  | 'back'
  | 'home'
  | 'menu'
  | 'info'
  | 'volumeUp'
  | 'volumeDown'
  | 'mute'
  | 'channelUp'
  | 'channelDown'
  | 'digit0'
  | 'digit1'
  | 'digit2'
  | 'digit3'
  | 'digit4'
  | 'digit5'
  | 'digit6'
  | 'digit7'
  | 'digit8'
  | 'digit9'
  | 'play'
  | 'pause'
  | 'stop'
  | 'rewind'
  | 'fastForward';

export interface DiscoveredTv {
  /** Stable id within the app (e.g. adapter id + address). */
  id: string;
  name: string;
  ipAddress: string;
  port?: number;
  manufacturer?: string;
  model?: string;
  /** Which adapter can talk to this TV. */
  protocolId: string;
}

export interface TvConnection {
  tv: DiscoveredTv;
  connectedAt: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** Stable, user-facing error categories. Low-level errors are mapped into these by adapters/services. */
export type TvErrorCode =
  | 'permissionDenied'
  | 'networkUnavailable'
  | 'invalidAddress'
  | 'unreachable'
  | 'timeout'
  | 'unsupported'
  | 'cancelled'
  | 'unknown';

export class TvError extends Error {
  readonly code: TvErrorCode;

  constructor(code: TvErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code, options);
    this.name = 'TvError';
    this.code = code;
  }
}