import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { useTranslation } from '@/i18n';

export default function AppsScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('apps.title')}>
      <EmptyState
        title={t('apps.unsupported.title')}
        message={t('apps.unsupported.message')}
      />
    </Screen>
  );
}