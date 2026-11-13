import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { useTranslation } from '@/i18n';

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('home.title')}>
      <EmptyState title={t('home.noTv.title')} message={t('home.noTv.message')} />
    </Screen>
  );
}