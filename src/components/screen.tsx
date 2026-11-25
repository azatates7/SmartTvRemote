import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Colors, MaxContentWidth, Spacing } from '@/constants/theme';

type ScreenProps = {
  title: string;
  children: ReactNode;
};

/**
 * Tüm ekranların ortak çerçevesidir.
 * Çentik ve sistem çubuklarına göre güvenli alanı bırakır, içeriği kaydırılabilir yapar ve ekran okuyucular için sayfa başlığını işaretler.
 * Klavye açıkken bir düğmeye dokunulursa dokunuş klavyeyi kapatmakla harcanmaz, düğme ilk dokunuşta çalışır.
 */
export function Screen({ title, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="subtitle" accessibilityRole="header" style={styles.title}>
          {title}
        </ThemedText>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.two,
  },
});