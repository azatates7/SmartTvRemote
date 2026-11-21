import { useLocales } from 'expo-localization';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  loadLanguagePreference,
  saveLanguagePreference,
  type LanguagePreference,
} from './language-storage';
import { en, tr, type StringKey } from './strings';

export type Language = 'tr' | 'en';
export type { LanguagePreference, StringKey };

const dictionaries: Record<Language, Record<StringKey, string>> = { tr, en };

/** Turkish if the device's preferred language is Turkish, otherwise English. */
export function resolveLanguage(languageCode: string | null | undefined): Language {
  return languageCode === 'tr' ? 'tr' : 'en';
}

type LanguageContextValue = {
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
  preference: 'system',
  setPreference: () => {},
});

/** Holds the language choice from Settings. Default: follow the device language. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>('system');

  useEffect(() => {
    let active = true;
    loadLanguagePreference().then((stored) => {
      if (active) setPreferenceState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback((next: LanguagePreference) => {
    setPreferenceState(next);
    saveLanguagePreference(next);
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);
  return createElement(LanguageContext.Provider, { value }, children);
}

export function useLanguagePreference() {
  return useContext(LanguageContext);
}

/**
 * Returns `t(key)` for the app language: the one chosen in Settings, or the device language.
 * `useLocales` re-renders when the device language changes.
 */
export function useTranslation() {
  const [primary] = useLocales();
  const { preference } = useContext(LanguageContext);
  const language: Language =
    preference === 'system' ? resolveLanguage(primary?.languageCode) : preference;

  const t = useCallback((key: StringKey) => dictionaries[language][key], [language]);

  return { t, language };
}