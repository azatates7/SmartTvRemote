/**
 * GEÇİCİ: Ayarlar ekranında TV tanılama raporunu gösterir.
 * Rapor yalnızca okuma (GET) istekleriyle hazırlanır ve TV'de hiçbir şeyi değiştirmez.
 * Kullanıcı raporu telefonun paylaşım menüsüyle geliştiriciye gönderebilir.
 * Kaldırmak için bu dosyayı, `protocols/smart-center/diagnostics.ts` dosyasını, `diag.*` metinlerini ve `app/settings.tsx` içindeki <DiagnosticsPanel /> bölümünü silmek yeterlidir.
 */

import { useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { runDiagnostics } from '@/protocols/smart-center/diagnostics';
import { useConnection } from '@/services/connection-context';

export function DiagnosticsPanel() {
  const { t } = useTranslation();
  const { state } = useConnection();
  const [lines, setLines] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (state.status !== 'connected') {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={styles.padded}>
        {t('diag.needsConnection')}
      </ThemedText>
    );
  }

  const run = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLines([]);
    setRunning(true);
    try {
      await runDiagnostics({
        ipAddress: state.tv.ipAddress,
        signal: controller.signal,
        onLine: (line) => setLines((prev) => [...prev, line]),
      });
    } finally {
      if (!controller.signal.aborted) setRunning(false);
    }
  };

  const report = lines.join('\n');

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {t('diag.intro')}
      </ThemedText>

      {lines.length > 0 ? (
        <ThemedText type="small" selectable style={styles.report}>
          {report}
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={running ? t('diag.running') : t('diag.run')}
          onPress={running ? () => {} : run}
        />
        {!running && lines.length > 0 ? (
          <Button
            label={t('diag.share')}
            variant="secondary"
            onPress={() => Share.share({ message: report }).catch(() => {})}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  padded: {
    paddingVertical: Spacing.three,
  },
  report: {
    fontFamily: Fonts?.mono,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textSecondary,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Colors.background,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});