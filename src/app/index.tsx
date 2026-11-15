import { StyleSheet } from 'react-native';

import { DiscoverTvPanel } from '@/components/discover-tv-panel';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ThemedView } from '@/components/themed-view';
import { TvCard } from '@/components/tv-card';
import { Radius, Spacing } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { useSavedTvs } from '@/services/saved-tvs-context';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { status, tvs } = useSavedTvs();

  return (
    <Screen title={t('home.title')}>
      {status === 'ready' && tvs.length === 0 ? (
        <>
          <EmptyState title={t('home.noTv.title')} message={t('home.noTv.message')} />
          <ThemedView type="backgroundElement" style={styles.discoverCard}>
            <DiscoverTvPanel />
          </ThemedView>
        </>
      ) : null}

      {tvs.map((tv) => (
        <TvCard key={tv.id} tv={tv} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  discoverCard: {
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.four,
  },
});