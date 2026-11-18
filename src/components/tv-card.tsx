import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { SavedTv, TvErrorCode } from '@/domain/tv';
import { useTranslation, type StringKey } from '@/i18n';
import { useConnection } from '@/services/connection-context';

const errorKeys: Partial<Record<TvErrorCode, StringKey>> = {
  invalidAddress: 'check.error.invalidAddress',
  timeout: 'check.error.timeout',
  unreachable: 'check.error.unreachable',
  unsupported: 'check.error.unsupported',
  networkUnavailable: 'discover.error.noWifi',
};

/** Saved TV on Home: connect / disconnect. Only one TV is connected at a time. */
export function TvCard({ tv }: { tv: SavedTv }) {
  const { t } = useTranslation();
  const { state, connect, disconnect } = useConnection();
  const mine = state.status !== 'disconnected' && state.tv.id === tv.id ? state : null;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View accessible>
        <ThemedText type="smallBold">{tv.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {tv.model ? `${tv.model} · ${tv.ipAddress}` : tv.ipAddress}
        </ThemedText>
      </View>

      <View accessibilityLiveRegion="polite">
        {!mine ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('connection.notConnected')}
          </ThemedText>
        ) : null}
        {mine?.status === 'connecting' ? (
          <ThemedText type="small" themeColor="textSecondary">
            {mine.searching ? t('connection.searching') : t('connection.connecting')}
          </ThemedText>
        ) : null}
        {mine?.status === 'connected' ? (
          <>
            <ThemedText type="small" style={styles.ok}>
              {t('connection.connected')}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {[mine.probe.appName, mine.probe.appState].filter(Boolean).join(' · ')}
              {` · ${mine.probe.elapsedMs} ms`}
            </ThemedText>
          </>
        ) : null}
        {mine?.status === 'error' ? (
          <ThemedText type="small" style={styles.error} accessibilityRole="alert">
            {t(errorKeys[mine.code] ?? 'check.error.unknown')}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.actions}>
        {mine?.status === 'connected' ? (
          <Button
            label={t('connection.disconnect')}
            variant="secondary"
            accessibilityLabel={`${t('connection.disconnect')}: ${tv.name}`}
            onPress={disconnect}
          />
        ) : mine?.status === 'connecting' ? null : (
          <Button
            label={mine?.status === 'error' ? t('connection.retry') : t('connection.connect')}
            accessibilityLabel={`${t('connection.connect')}: ${tv.name}`}
            onPress={() => connect(tv)}
          />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
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