import { useLocales } from 'expo-localization';
import { useCallback } from 'react';

import { en, tr, type StringKey } from './strings';

export type Language = 'tr' | 'en';
export type { StringKey };

const dictionaries: Record<Language, Record<StringKey, string>> = { tr, en };

/** Turkish if the device's preferred language is Turkish, otherwise English. */
export function resolveLanguage(languageCode: string | null | undefined): Language {
  return languageCode === 'tr' ? 'tr' : 'en';
}

/**
 * Returns `t(key)` for the device's current language.
 * `useLocales` re-renders when the device language changes.
 */
export function useTranslation() {
  const [primary] = useLocales();
  const language = resolveLanguage(primary?.languageCode);

  const t = useCallback((key: StringKey) => dictionaries[language][key], [language]);

  return { t, language };
}