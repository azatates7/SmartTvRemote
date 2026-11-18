/**
 * Pure decision for "add a TV": identity first, IP second.
 *
 * 1. Same `deviceId` already saved → update that TV's address (never a second entry).
 * 2. A saved TV WITHOUT identity has this IP → if the new TV has an identity, attach it to that
 *    record (old records gain an identity); otherwise it is a duplicate.
 * 3. A saved TV WITH a different identity has this IP → its address is stale (DHCP gave the IP
 *    to another TV): add the new TV.
 * 4. Otherwise add.
 */

import type { DeviceIdentity, SavedTv } from './tv';

export type AddTvPlan =
  | {
      kind: 'update';
      id: string;
      patch: Pick<SavedTv, 'ipAddress'> & Partial<Pick<SavedTv, 'deviceId' | 'model'>>;
    }
  | { kind: 'duplicate' }
  | { kind: 'add'; tv: SavedTv };

export function planAddTv({
  current,
  name,
  ipAddress,
  identity,
  maxNameLength,
  newId,
  now,
}: {
  current: readonly SavedTv[];
  name: string;
  /** Already validated private IPv4. */
  ipAddress: string;
  identity?: DeviceIdentity | null;
  maxNameLength: number;
  newId: string;
  now: number;
}): AddTvPlan {
  const sameDevice = identity ? current.find((tv) => tv.deviceId === identity.deviceId) : undefined;
  if (sameDevice) {
    return {
      kind: 'update',
      id: sameDevice.id,
      patch: { ipAddress, model: identity?.model ?? sameDevice.model },
    };
  }

  const sameIp = current.find((tv) => tv.ipAddress === ipAddress);
  if (sameIp) {
    if (!sameIp.deviceId) {
      if (!identity) return { kind: 'duplicate' };
      return {
        kind: 'update',
        id: sameIp.id,
        patch: { ipAddress, deviceId: identity.deviceId, model: identity.model ?? sameIp.model },
      };
    }
    // Saved TV at this IP has a different identity: different TV, fall through and add.
    if (!identity) return { kind: 'duplicate' };
  }

  const trimmed = name.trim().slice(0, maxNameLength);
  const fallback = (identity?.friendlyName || `TV ${ipAddress}`).slice(0, maxNameLength);
  return {
    kind: 'add',
    tv: {
      id: newId,
      name: trimmed || fallback,
      ipAddress,
      addedAt: now,
      deviceId: identity?.deviceId,
      model: identity?.model,
    },
  };
}