import AsyncStorage from '@react-native-async-storage/async-storage';

import { isValidDialName, type DialAppDefinition } from '@/protocols/smart-center/dial-apps';

/** Apps the user added from search. Stores only names, never credentials. Versioned key. */
const STORAGE_KEY = 'smarttvremote.customApps.v1';

function isDefinition(value: unknown): value is DialAppDefinition {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    Array.isArray(v.dialNames) &&
    v.dialNames.length > 0 &&
    v.dialNames.every((n) => typeof n === 'string' && isValidDialName(n))
  );
}

/** Corrupt entries are dropped instead of crashing the app. */
export async function loadCustomApps(): Promise<DialAppDefinition[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isDefinition) : [];
  } catch {
    return [];
  }
}

export async function writeCustomApps(apps: readonly DialAppDefinition[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}