import AsyncStorage from '@react-native-async-storage/async-storage';

/** User's language choice: follow the device (default) or a fixed language. */
export type LanguagePreference = 'system' | 'tr' | 'en';

const STORAGE_KEY = 'smarttvremote.language.v1';

export async function loadLanguagePreference(): Promise<LanguagePreference> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value === 'tr' || value === 'en' ? value : 'system';
  } catch {
    return 'system';
  }
}

/** Best effort: failing only means the choice is not kept after a restart. */
export function saveLanguagePreference(preference: LanguagePreference): void {
  (preference === 'system'
    ? AsyncStorage.removeItem(STORAGE_KEY)
    : AsyncStorage.setItem(STORAGE_KEY, preference)
  ).catch(() => {});
}