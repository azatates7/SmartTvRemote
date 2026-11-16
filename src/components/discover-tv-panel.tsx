import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AddTvForm } from '@/components/add-tv-form';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { TvError, type TvErrorCode } from '@/domain/tv';
import { useTranslation } from '@/i18n';
import {
  discoverSmartCenterTvs,
  type DiscoveredSmartCenter,
  type DiscoveryProgress,
} from '@/protocols/smart-center/discover';
import { useSavedTvs } from '@/services/saved-tvs-context';

type ScanState =
  | { kind: 'idle' }
  | { kind: 'scanning'; progress: DiscoveryProgress }
  | { kind: 'done' }
  | { kind: 'failed'; code: TvErrorCode };

/** Finds TVs on the phone's Wi-Fi (same /24 network) and lets the user save them with one tap. */
export function DiscoverTvPanel() {
  const { t } = useTranslation();
  const { tvs } = useSavedTvs();
  const [state, setState] = useState<ScanState>({ kind: 'idle' });
  const [found, setFound] = useState<DiscoveredSmartCenter[]>([]);
  /** IP of the found TV the user is currently naming. */
  const [namingIp, setNamingIp] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFound([]);
    setState({ kind: 'scanning', progress: { scanned: 0, total: 0 } });

    try {
      await discoverSmartCenterTvs({
        signal: controller.signal,
        onProgress: (progress) => setState({ kind: 'scanning', progress }),
        onFound: (tv) => setFound((prev) => [...prev, tv]),
      });
      setState({ kind: 'done' });
    } catch (error) {
      const code = error instanceof TvError ? error.code : 'unknown';
      setState(code === 'cancelled' ? { kind: 'done' } : { kind: 'failed', code });
    }
  };

  const stop = () => abortRef.current?.abort();

  const savedIps = new Set(tvs.map((tv) => tv.ipAddress));

  return (
    <View style={styles.container}>
      <View accessibilityLiveRegion="polite">
        {state.kind === 'idle' ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('discover.intro')}
          </ThemedText>
        ) : null}
        {state.kind === 'scanning' ? (
          <ThemedText type="small" themeColor="textSecondary">
            {state.progress.total > 0
              ? `${t('discover.scanning')} ${state.progress.scanned}/${state.progress.total}`
              : t('discover.preparing')}
          </ThemedText>
        ) : null}
        {state.kind === 'done' && found.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('discover.noneFound')}
          </ThemedText>
        ) : null}
        {state.kind === 'failed' ? (
          <ThemedText type="small" style={styles.error} accessibilityRole="alert">
            {state.code === 'networkUnavailable' ? t('discover.error.noWifi') : t('discover.error.unknown')}
          </ThemedText>
        ) : null}
      </View>

      {found.map((tv) => {
        const saved = savedIps.has(tv.ipAddress);
        if (namingIp === tv.ipAddress && !saved) {
          return <AddTvForm key={tv.ipAddress} fixedIp={tv.ipAddress} onDone={() => setNamingIp(null)} />;
        }
        return (
          <View key={tv.ipAddress} style={styles.foundRow}>
            <View style={styles.foundInfo} accessible>
              <ThemedText type="small">{tv.ipAddress}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {[tv.probe.appName, tv.probe.appState].filter(Boolean).join(' · ') ||
                  t('discover.respondedOnPort')}
              </ThemedText>
            </View>
            {saved ? (
              <ThemedText type="small" themeColor="textSecondary">
                {t('discover.alreadySaved')}
              </ThemedText>
            ) : (
              <Button
                label={t('discover.add')}
                accessibilityLabel={`${t('discover.add')}: ${tv.ipAddress}`}
                onPress={() => setNamingIp(tv.ipAddress)}
              />
            )}
          </View>
        );
      })}

      <View style={styles.actions}>
        {state.kind === 'scanning' ? (
          <Button label={t('discover.stop')} variant="secondary" onPress={stop} />
        ) : (
          <Button
            label={state.kind === 'idle' ? t('discover.start') : t('discover.again')}
            onPress={start}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  foundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  foundInfo: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  actions: {
    flexDirection: 'row',
  },
  error: {
    color: Colors.danger,
  },
});