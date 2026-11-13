import { StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { useSavedTvs } from '@/services/saved-tvs-context';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { status, tvs } = useSavedTvs();

  return (
    <Screen title={t('home.title')}>
      {status === 'ready' && tvs.length === 0 ? (
        <EmptyState title={t('home.noTv.title')} message={t('home.noTv.message')} />
      ) : null}

      {tvs.map((tv) => (
        <ThemedView
          key={tv.id}
          type="backgroundElement"
          style={styles.card}
          accessible
          accessibilityLabel={`${tv.name}, ${tv.ipAddress}. ${t('home.tv.notChecked')}`}>
          <ThemedText type="smallBold">{tv.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {tv.ipAddress}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('home.tv.notChecked')}
          </ThemedText>
        </ThemedView>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    gap: Spacing.one,
  },
});