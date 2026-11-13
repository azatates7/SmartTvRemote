import AsyncStorage from '@react-native-async-storage/async-storage';

import { parsePrivateIPv4 } from '@/domain/ip-address';
import type { SavedTv } from '@/domain/tv';

/** Versioned key: bump the suffix and migrate if the stored shape ever changes. */
const STORAGE_KEY = 'smarttvremote.savedTvs.v1';

function isSavedTv(value: unknown): value is SavedTv {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.ipAddress === 'string' &&
    parsePrivateIPv4(v.ipAddress).ok &&
    typeof v.addedAt === 'number'
  );
}

/** Returns saved TVs. Corrupt or unexpected entries are dropped instead of crashing the app. */
export async function loadSavedTvs(): Promise<SavedTv[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  return Array.isArray(parsed) ? parsed.filter(isSavedTv) : [];
}

export async function writeSavedTvs(tvs: readonly SavedTv[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tvs));
}