import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Apps the last connected TV reported, so the Apps and Remote screens can show them while no TV
 * is connected. Display only: launching still needs a connection (and re-checks the TV).
 */
export type LastTvApps = {
  tvId: string;
  apps: { id: string; label: string }[];
};

const STORAGE_KEY = 'smarttvremote.lastTvApps.v1';

export async function loadLastTvApps(): Promise<LastTvApps | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isLastTvApps(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Best effort: failing only means the list is not shown while disconnected. */
export function saveLastTvApps(value: LastTvApps): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value)).catch(() => {});
}

function isLastTvApps(value: unknown): value is LastTvApps {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.tvId === 'string' &&
    Array.isArray(v.apps) &&
    v.apps.every(
      (a) =>
        typeof a === 'object' &&
        a !== null &&
        typeof (a as Record<string, unknown>).id === 'string' &&
        typeof (a as Record<string, unknown>).label === 'string',
    )
  );
}