import Constants from 'expo-constants';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AddTvForm } from '@/components/add-tv-form';
import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { useSavedTvs } from '@/services/saved-tvs-context';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '—';

  return (
    <Screen title={t('settings.title')}>
      <Section title={t('settings.section.tv')}>
        <SavedTvsSection />
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

function SavedTvsSection() {
  const { t } = useTranslation();
  const { status, tvs, storageError, removeTv } = useSavedTvs();
  const [adding, setAdding] = useState(false);

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

      {tvs.length === 0 && !adding ? <Row label={t('settings.tv.none')} /> : null}

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

      {adding ? (
        <AddTvForm onDone={() => setAdding(false)} />
      ) : (
        <View style={styles.addButton}>
          <Button label={t('settings.tv.add')} onPress={() => setAdding(true)} />
        </View>
      )}
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
  addButton: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.three,
  },
  errorText: {
    color: Colors.danger,
    paddingTop: Spacing.three,
  },
});