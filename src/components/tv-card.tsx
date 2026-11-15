import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { TvError, type SavedTv, type TvErrorCode } from '@/domain/tv';
import { useTranslation, type StringKey } from '@/i18n';
import { probeSmartCenter, type SmartCenterProbeResult } from '@/protocols/smart-center/probe';

type CheckState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'responded'; result: SmartCenterProbeResult }
  | { kind: 'failed'; code: TvErrorCode };

const errorKeys: Partial<Record<TvErrorCode, StringKey>> = {
  invalidAddress: 'check.error.invalidAddress',
  timeout: 'check.error.timeout',
  unreachable: 'check.error.unreachable',
};

/** Saved TV with an experimental, read-only connection check. Results are not persisted. */
export function TvCard({ tv }: { tv: SavedTv }) {
  const { t } = useTranslation();
  const [state, setState] = useState<CheckState>({ kind: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  // Cancel an in-flight check if the card unmounts (e.g. TV removed).
  useEffect(() => () => abortRef.current?.abort(), []);

  const check = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: 'checking' });

    try {
      const result = await probeSmartCenter({ ipAddress: tv.ipAddress, signal: controller.signal });
      setState({ kind: 'responded', result });
    } catch (error) {
      const code = error instanceof TvError ? error.code : 'unknown';
      if (code !== 'cancelled') setState({ kind: 'failed', code });
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View accessible>
        <ThemedText type="smallBold">{tv.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {tv.ipAddress}
        </ThemedText>
      </View>

      <View accessibilityLiveRegion="polite">
        <CheckStatus state={state} />
      </View>

      <View style={styles.actions}>
        {state.kind === 'checking' ? null : (
          <Button
            label={t('check.button')}
            variant="secondary"
            accessibilityLabel={`${t('check.button')}: ${tv.name}`}
            onPress={check}
          />
        )}
      </View>
    </ThemedView>
  );
}

function CheckStatus({ state }: { state: CheckState }) {
  const { t } = useTranslation();

  switch (state.kind) {
    case 'idle':
      return (
        <ThemedText type="small" themeColor="textSecondary">
          {t('home.tv.notChecked')}
        </ThemedText>
      );
    case 'checking':
      return (
        <ThemedText type="small" themeColor="textSecondary">
          {t('check.checking')}
        </ThemedText>
      );
    case 'failed':
      return (
        <ThemedText type="small" style={styles.error} accessibilityRole="alert">
          {t(errorKeys[state.code] ?? 'check.error.unknown')}
        </ThemedText>
      );
    case 'responded': {
      const { result } = state;
      const ok = result.httpStatus >= 200 && result.httpStatus < 300;
      return (
        <View style={styles.result}>
          <ThemedText type="small" style={ok ? styles.ok : styles.error}>
            {ok ? t('check.responded') : t('check.respondedWithError')}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {`HTTP ${result.httpStatus} · ${result.elapsedMs} ms`}
            {result.appName ? ` · ${result.appName}` : ''}
            {result.appState ? ` (${result.appState})` : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('check.experimentalNote')}
          </ThemedText>
          {result.body ? (
            <ThemedText type="small" themeColor="textSecondary" selectable style={styles.raw}>
              {result.body}
            </ThemedText>
          ) : null}
        </View>
      );
    }
  }
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
  result: {
    gap: Spacing.one,
  },
  ok: {
    color: Colors.accent,
  },
  error: {
    color: Colors.danger,
  },
  raw: {
    fontFamily: Fonts?.mono,
    fontSize: 12,
    lineHeight: 16,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Colors.background,
  },
});