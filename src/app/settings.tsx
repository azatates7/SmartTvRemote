import Constants from 'expo-constants';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <Screen title={t('settings.title')}>
      <Section title={t('settings.section.tv')}>
        <Row label={t('settings.tv.none')} note={t('settings.tv.comingSoon')} />
      </Section>

      <Section title={t('settings.section.language')}>
        <Row
          label={t('settings.language.current')}
          value={t('language.name')}
          note={t('settings.language.followsDevice')}
        />
      </Section>

      <Section title={t('settings.section.about')}>
        <Row label={t('settings.about.version')} value={version} />
        <Row label={t('settings.about.disclaimer')} />
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" accessibilityRole="header">
        {title}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.card}>
        {children}
      </ThemedView>
    </View>
  );
}

function Row({ label, value, note }: { label: string; value?: string; note?: string }) {
  return (
    <View style={styles.row} accessible>
      <View style={styles.rowMain}>
        <ThemedText type="small" style={styles.rowLabel}>
          {label}
        </ThemedText>
        {value ? (
          <ThemedText type="small" themeColor="textSecondary">
            {value}
          </ThemedText>
        ) : null}
      </View>
      {note ? (
        <ThemedText type="small" themeColor="textSecondary">
          {note}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.three,
  },
  row: {
    minHeight: MinTouchTarget,
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  rowLabel: {
    flexShrink: 1,
  },
});