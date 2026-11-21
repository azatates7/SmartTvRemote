import { DarkTheme, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import AppTabs from '@/components/app-tabs';
import { Colors } from '@/constants/theme';
import { LanguageProvider } from '@/i18n';
import { ConnectionProvider } from '@/services/connection-context';
import { SavedTvsProvider } from '@/services/saved-tvs-context';

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.accent,
    background: Colors.background,
    card: Colors.backgroundElement,
    text: Colors.text,
    border: Colors.border,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <LanguageProvider>
        <SavedTvsProvider>
          <ConnectionProvider>
            <AppTabs />
          </ConnectionProvider>
        </SavedTvsProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}