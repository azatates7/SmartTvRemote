import Constants from 'expo-constants';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { DiagnosticsPanel } from '@/components/diagnostics-panel';
import { DiscoverTvPanel } from '@/components/discover-tv-panel';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useLanguagePreference, useTranslation, type LanguagePreference } from '@/i18n';
import { useSavedTvs } from '@/services/saved-tvs-context';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <Screen title={t('settings.title')}>
      <Section title={t('settings.section.tv')}>
        <SavedTvsSection />
      </Section>

      {/* TEMPORARY: remove together with components/diagnostics-panel.tsx */}
      <Section title={t('diag.title')}>
        <DiagnosticsPanel />
      </Section>

      <Section title={t('settings.section.language')}>
        <LanguagePicker />
      </Section>

      <Section title={t('settings.section.about')}>
        <Row label={t('settings.about.version')} value={version} />
        <Row label={t('settings.about.disclaimer')} />
      </Section>
    </Screen>
  );
}

function SavedTvsSection() {
  const { t } = useTranslation();
  const { status, tvs, storageError, removeTv } = useSavedTvs();

  if (status === 'loading') {
    return <Row label={t('common.loading')} />;
  }

  return (
    <>
      {storageError ? (
        <ThemedText type="small" style={styles.errorText} accessibilityRole="alert">
          {t('settings.tv.storageError')}
        </ThemedText>
      ) : null}

      {tvs.length === 0 ? <Row label={t('settings.tv.none')} /> : null}

      {tvs.map((tv) => (
        <View key={tv.id} style={styles.tvRow}>
          <View style={styles.tvInfo} accessible>
            <ThemedText type="small">{tv.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {tv.ipAddress}
            </ThemedText>
          </View>
          <Button
            label={t('settings.tv.remove')}
            variant="danger"
            accessibilityLabel={`${t('settings.tv.remove')}: ${tv.name}`}
            onPress={() => removeTv(tv.id)}
          />
        </View>
      ))}

      {/* TVs are added only by searching the Wi-Fi network (no manual IP entry). */}
      <DiscoverTvPanel />
    </>
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

/** Device language is the default; Turkish / English are fixed choices, kept after restart. */
function LanguagePicker() {
  const { t } = useTranslation();
  const { preference, setPreference } = useLanguagePreference();
  const options: { value: LanguagePreference; label: string; note?: string }[] = [
    {
      value: 'system',
      label: t('settings.language.system'),
      note: t('settings.language.followsDevice'),
    },
    // Each language is named in itself, so it can be found whatever the current language is.
    { value: 'tr', label: 'Türkçe' },
    { value: 'en', label: 'English' },
  ];

  return (
    <View accessibilityRole="radiogroup">
      {options.map((option, index) => {
        const selected = preference === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => setPreference(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={({ pressed }) => [
              styles.languageOption,
              index > 0 && styles.languageDivider,
              pressed && styles.pressed,
            ]}>
            <View style={styles.tvInfo}>
              <ThemedText type="small">{option.label}</ThemedText>
              {option.note ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {option.note}
                </ThemedText>
              ) : null}
            </View>
            {selected ? <Icon name="check" color={Colors.accent} /> : null}
          </Pressable>
        );
      })}
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
  tvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  tvInfo: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  languageOption: {
    minHeight: MinTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  languageDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  errorText: {
    color: Colors.danger,
    paddingTop: Spacing.three,
  },
});