import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { SavedTv, TvErrorCode } from '@/domain/tv';
import { useTranslation, type StringKey } from '@/i18n';
import { useConnection, type WakeReport } from '@/services/connection-context';

/** Bu hatalardan sonra TV büyük ihtimalle kapalı ya da beklemededir; bağlı TV yokken son TV'ye ek olarak "TV'yi aç" düğmesi bu durumlarda da gösterilir. */
const WAKE_AFTER: TvErrorCode[] = ['unreachable', 'timeout', 'wakeFailed'];

const errorKeys: Partial<Record<TvErrorCode, StringKey>> = {
  invalidAddress: 'check.error.invalidAddress',
  timeout: 'check.error.timeout',
  unreachable: 'check.error.unreachable',
  unsupported: 'check.error.unsupported',
  networkUnavailable: 'discover.error.noWifi',
  wakeFailed: 'wake.error.failed',
};

/**
 * Ana Sayfa'da kayıtlı bir TV'yi kart olarak gösterir: ad, model, IP adresi ve bağlantı durumu.
 * Kart üzerinden TV'ye bağlanılır, bağlantı kesilir ya da hata sonrası tekrar denenir.
 * Aynı anda yalnızca bir TV'ye bağlı olunabilir; başka bir TV'ye bağlanmak öncekinin bağlantısını kapatır.
 */
export function TvCard({ tv }: { tv: SavedTv }) {
  const { t } = useTranslation();
  const { state, connect, disconnect, wake, canWake, lastTv } = useConnection();
  const mine = state.status !== 'disconnected' && state.tv.id === tv.id ? state : null;
  // "TV'yi aç" iki durumda gösterilir: hiçbir TV'ye bağlı değilken son bağlanılan TV'de, ya da bu TV'ye ulaşılamadığını gösteren bir hatadan sonra.
  // TV cevap veriyorsa (ör. Smart Center henüz hazır değil) TV zaten açıktır ve düğme gösterilmez.
  const showWake =
    canWake(tv) &&
    ((state.status === 'disconnected' && (!lastTv || lastTv.tv.id === tv.id)) ||
      (mine?.status === 'error' && WAKE_AFTER.includes(mine.code)));

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
            {mine.waking ? t('connection.waking') : mine.searching ? t('connection.searching') : t('connection.connecting')}
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
          <>
            <ThemedText type="small" style={styles.error} accessibilityRole="alert">
              {t(errorKeys[mine.code] ?? 'check.error.unknown')}
            </ThemedText>
            {mine.wake ? <WakeDetails report={mine.wake} ipAddress={tv.ipAddress} /> : null}
          </>
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
          <>
            <Button
              label={mine?.status === 'error' ? t('connection.retry') : t('connection.connect')}
              accessibilityLabel={`${t('connection.connect')}: ${tv.name}`}
              onPress={() => connect(tv)}
            />
            {showWake ? (
              <Button
                label={t('wake.button')}
                variant="secondary"
                accessibilityLabel={`${t('wake.button')}: ${tv.name}`}
                onPress={() => wake(tv)}
              />
            ) : null}
          </>
        )}
      </View>
    </ThemedView>
  );
}

/** "TV'yi aç" başarısız olduğunda hangi adımda takıldığını satır satır gösterir: MAC adresi, gönderilen paketler, bekleme ve ağ taraması. */
export function WakeDetails({ report, ipAddress }: { report: WakeReport; ipAddress: string }) {
  const { t } = useTranslation();
  const fill = (key: StringKey, values: Record<string, string | number>) =>
    Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), t(key));

  const lines: string[] = [fill('wake.detail.mac', { mac: report.mac.toUpperCase() })];
  if (report.failedStep === 'network') lines.push(t('wake.detail.noWifi'));
  if (report.failedStep === 'send') lines.push(fill('wake.detail.sendFailed', { message: report.message ?? '?' }));
  if (report.rounds > 0) {
    lines.push(fill('wake.detail.sent', { rounds: report.rounds, targets: report.targets.join(', ') }));
  }
  if (report.waitedSeconds > 0) lines.push(fill('wake.detail.waited', { seconds: report.waitedSeconds, ip: ipAddress }));
  if (report.failedStep === 'notFound') lines.push(t('wake.detail.notFound'));

  return (
    <View style={styles.details} accessible>
      {lines.map((line) => (
        <ThemedText key={line} type="small" themeColor="textSecondary">
          • {line}
        </ThemedText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  details: {
    gap: Spacing.one,
  },
  card: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  ok: {
    color: Colors.accent,
  },
  error: {
    color: Colors.danger,
  },
});