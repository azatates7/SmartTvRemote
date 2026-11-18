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
  const { tvs, getTvs, updateTv } = useSavedTvs();
  const [state, setState] = useState<ScanState>({ kind: 'idle' });
  const [found, setFound] = useState<DiscoveredSmartCenter[]>([]);
  /** IP of the found TV the user is currently naming. */
  const [namingIp, setNamingIp] = useState<string | null>(null);
  /** Found IP → name of the saved TV whose address was updated to it. */
  const [relocated, setRelocated] = useState<Record<string, string>>({});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const start = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setFound([]);
    setRelocated({});
    setState({ kind: 'scanning', progress: { scanned: 0, total: 0 } });

    try {
      await discoverSmartCenterTvs({
        signal: controller.signal,
        onProgress: (progress) => setState({ kind: 'scanning', progress }),
        onFound: (tv) => {
          setFound((prev) => [...prev, tv]);
          // Same TV (identity match) at a new address: update the saved TV instead of adding a new one.
          const deviceId = tv.identity?.deviceId;
          const saved = deviceId ? getTvs().find((s) => s.deviceId === deviceId) : undefined;
          if (saved && saved.ipAddress !== tv.ipAddress) {
            updateTv(saved.id, { ipAddress: tv.ipAddress, model: tv.identity?.model ?? saved.model });
            setRelocated((prev) => ({ ...prev, [tv.ipAddress]: saved.name }));
          }
        },
      });
      setState({ kind: 'done' });
    } catch (error) {
      const code = error instanceof TvError ? error.code : 'unknown';
      setState(code === 'cancelled' ? { kind: 'done' } : { kind: 'failed', code });
    }
  };

  const stop = () => abortRef.current?.abort();

  const scanDone = state.kind === 'done';
  // Saved TVs without identity that did not answer at their saved address in this scan:
  // a newly found TV may be one of them with a new IP (the user decides).
  const missingSaved = scanDone
    ? tvs.filter((s) => !s.deviceId && !found.some((f) => f.ipAddress === s.ipAddress))
    : [];

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
        const deviceId = tv.identity?.deviceId;
        // Saved = same identity, or same IP when identity cannot tell them apart
        // (a saved TV with a different identity at this IP has a stale address: not this TV).
        const saved = tvs.find(
          (s) =>
            (deviceId && s.deviceId === deviceId) ||
            (s.ipAddress === tv.ipAddress && (!deviceId || !s.deviceId)),
        );
        if (namingIp === tv.ipAddress && !saved) {
          return (
            <AddTvForm
              key={tv.ipAddress}
              fixedIp={tv.ipAddress}
              identity={tv.identity}
              onDone={() => setNamingIp(null)}
            />
          );
        }
        const title = tv.identity?.friendlyName ?? tv.ipAddress;
        const subtitle = [tv.identity?.model, tv.identity?.friendlyName ? tv.ipAddress : undefined]
          .filter(Boolean)
          .join(' · ');
        return (
          <View key={tv.ipAddress} style={styles.foundItem}>
            <View style={styles.foundRow}>
              <View style={styles.foundInfo} accessible>
                <ThemedText type="small">{title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {subtitle || t('discover.respondedOnPort')}
                </ThemedText>
              </View>
              {relocated[tv.ipAddress] ? (
                <ThemedText type="small" style={styles.ok}>
                  {`${t('discover.addressUpdated')} ${relocated[tv.ipAddress]}`}
                </ThemedText>
              ) : saved ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('discover.alreadySaved')}
                </ThemedText>
              ) : (
                <Button
                  label={t('discover.add')}
                  accessibilityLabel={`${t('discover.add')}: ${title}`}
                  onPress={() => setNamingIp(tv.ipAddress)}
                />
              )}
            </View>
            {!saved && !relocated[tv.ipAddress]
              ? missingSaved.map((s) => (
                  <Button
                    key={s.id}
                    variant="secondary"
                    label={`${t('discover.isNewAddressOf')} ${s.name}`}
                    onPress={() => {
                      updateTv(s.id, {
                        ipAddress: tv.ipAddress,
                        deviceId: tv.identity?.deviceId,
                        model: tv.identity?.model ?? s.model,
                      });
                      setRelocated((prev) => ({ ...prev, [tv.ipAddress]: s.name }));
                    }}
                  />
                ))
              : null}
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
  foundItem: {
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  foundRow: {
    alignSelf: 'stretch',
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
  ok: {
    color: Colors.accent,
    flexShrink: 1,
    textAlign: 'right',
  },
});