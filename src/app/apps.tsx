import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppBadge } from '@/components/app-badge';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import type { TvErrorCode } from '@/domain/tv';
import { useTranslation, type StringKey } from '@/i18n';
import {
  customAppFromQuery,
  MIN_SEARCH_LENGTH,
  searchCatalog,
} from '@/protocols/smart-center/app-catalog';
import type { DialAppDefinition, DialAppId } from '@/protocols/smart-center/dial-apps';
import { useConnection, type AddAppResult } from '@/services/connection-context';

const errorKeys: Partial<Record<TvErrorCode, StringKey>> = {
  timeout: 'remote.error.timeout',
  unreachable: 'remote.error.unreachable',
};

const addResultKeys: Record<AddAppResult, StringKey> = {
  added: 'apps.add.added',
  alreadyAdded: 'apps.add.alreadyAdded',
  notFound: 'apps.add.notFound',
  failed: 'apps.add.failed',
};

export default function AppsScreen() {
  const { t } = useTranslation();
  const { state, apps, refreshApps, launchApp, lastCommand, customAppIds, removeApp } =
    useConnection();

  if (state.status !== 'connected') {
    return (
      <Screen title={t('apps.title')}>
        <EmptyState title={t('apps.noTv.title')} message={t('apps.noTv.message')} />
      </Screen>
    );
  }

  if (apps.status !== 'ready') {
    return (
      <Screen title={t('apps.title')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('apps.checking')}
        </ThemedText>
      </Screen>
    );
  }

  const installed = apps.apps.filter((app) => app.installed);
  const missing = apps.apps.filter((app) => !app.installed);
  const lastApp = lastCommand?.target.type === 'app' ? lastCommand : null;

  return (
    <Screen title={t('apps.title')}>
      {installed.length === 0 ? (
        <EmptyState title={t('apps.none.title')} message={t('apps.none.message')} />
      ) : (
        <ThemedView type="backgroundElement" style={styles.card}>
          {installed.map((app, index) => (
            <View
              key={app.id}
              style={[styles.row, index < installed.length - 1 && styles.rowDivider]}>
              <AppBadge appId={app.id} label={app.label} />
              <View style={styles.info} accessible>
                <ThemedText type="smallBold">{app.label}</ThemedText>
                {app.state ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {app.state === 'running' ? t('apps.state.running') : t('apps.state.stopped')}
                  </ThemedText>
                ) : null}
              </View>
              {customAppIds.has(app.id) ? (
                <Pressable
                  onPress={() => removeApp(app.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('apps.remove')}: ${app.label}`}
                  hitSlop={6}
                  style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
                  <Icon name="close" size={20} color={Colors.textSecondary} />
                </Pressable>
              ) : null}
              <Button
                label={t('apps.open')}
                accessibilityLabel={`${t('apps.open')}: ${app.label}`}
                onPress={() => launchApp(app.id)}
              />
            </View>
          ))}
        </ThemedView>
      )}

      <View accessibilityLiveRegion="polite">
        {lastApp ? (
          <ThemedText
            type="small"
            style={lastApp.ok ? undefined : styles.error}
            themeColor={lastApp.ok ? 'textSecondary' : undefined}>
            {lastApp.ok
              ? `${t('apps.launched')} · HTTP ${lastApp.httpStatus} · ${lastApp.elapsedMs} ms`
              : t(errorKeys[lastApp.code] ?? 'check.error.unknown')}
          </ThemedText>
        ) : null}
      </View>

      <AppSearch knownIds={new Set(apps.apps.filter((a) => a.installed).map((a) => a.id))} />

      {missing.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {`${t('apps.notFound')} ${missing.map((app) => app.label).join(', ')}`}
        </ThemedText>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary">
        {t('apps.experimentalNote')}
      </ThemedText>

      <View style={styles.actions}>
        <Button label={t('apps.refresh')} variant="secondary" onPress={refreshApps} />
      </View>
    </Screen>
  );
}

/** Search the catalog (min. 3 characters) or try a raw DIAL name; adding checks the TV first. */
function AppSearch({ knownIds }: { knownIds: ReadonlySet<DialAppId> }) {
  const { t } = useTranslation();
  const { addApp } = useConnection();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Record<DialAppId, AddAppResult | 'checking'>>({});

  const trimmed = query.trim();
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_SEARCH_LENGTH;

  const matches = useMemo(() => searchCatalog(query), [query]);
  // Offer "try this exact name on the TV" only when the catalog has nothing for the query.
  const custom = useMemo(
    () => (matches.length === 0 ? customAppFromQuery(query) : null),
    [query, matches],
  );

  const add = async (app: DialAppDefinition) => {
    setResults((prev) => ({ ...prev, [app.id]: 'checking' }));
    const result = await addApp(app);
    setResults((prev) => ({ ...prev, [app.id]: result }));
  };

  const rows: DialAppDefinition[] = custom ? [...matches, custom] : matches;

  return (
    <ThemedView type="backgroundElement" style={styles.searchCard}>
      <ThemedText type="smallBold" accessibilityRole="header">
        {t('apps.add.title')}
      </ThemedText>
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('apps.search.placeholder')}
          placeholderTextColor={Colors.textSecondary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={t('apps.search.placeholder')}
          style={styles.searchInput}
        />
        <Icon name="search" size={22} color={Colors.textSecondary} />
      </View>

      {tooShort ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('apps.search.minChars')}
        </ThemedText>
      ) : null}

      {!tooShort && trimmed.length >= MIN_SEARCH_LENGTH && rows.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t('apps.search.noResults')}
        </ThemedText>
      ) : null}

      {rows.map((app) => {
        const result = knownIds.has(app.id) ? 'alreadyAdded' : results[app.id];
        const isCustom = app.id.startsWith('custom:');
        return (
          <View key={app.id} style={styles.resultRow}>
            <AppBadge appId={app.id} label={app.label} size={36} />
            <View style={styles.info} accessible>
              <ThemedText type="small">
                {isCustom ? `${t('apps.search.tryName')} “${app.label}”` : app.label}
              </ThemedText>
              {result && result !== 'checking' ? (
                <ThemedText
                  type="small"
                  style={result === 'added' ? styles.ok : undefined}
                  themeColor={result === 'added' ? undefined : 'textSecondary'}>
                  {t(addResultKeys[result])}
                </ThemedText>
              ) : null}
            </View>
            {result === 'checking' ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('apps.add.checking')}
              </ThemedText>
            ) : result === 'added' || result === 'alreadyAdded' ? null : (
              <Button
                label={t('apps.add.button')}
                variant="secondary"
                accessibilityLabel={`${t('apps.add.button')}: ${app.label}`}
                onPress={() => add(app)}
              />
            )}
          </View>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
  removeButton: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.55,
  },
  searchCard: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MinTouchTarget,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  searchInput: {
    flex: 1,
    minHeight: MinTouchTarget,
    color: Colors.text,
    fontSize: 16,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
  },
  ok: {
    color: Colors.accent,
  },
  error: {
    color: Colors.danger,
  },
});