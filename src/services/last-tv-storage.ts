import AsyncStorage from '@react-native-async-storage/async-storage';

/** Id of the TV to reconnect to on app start. Cleared when the user disconnects on purpose. */
const STORAGE_KEY = 'smarttvremote.lastTvId.v1';

export async function loadLastTvId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Best effort: failing only means no auto-connect next time. */
export function saveLastTvId(id: string | null): void {
  (id ? AsyncStorage.setItem(STORAGE_KEY, id) : AsyncStorage.removeItem(STORAGE_KEY)).catch(() => {});
}