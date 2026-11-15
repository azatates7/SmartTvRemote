import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { useTranslation } from '@/i18n';

export default function RemoteScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('remote.title')}>
      <EmptyState title={t('remote.noTv.title')} message={t('remote.noTv.message')} />
    </Screen>
  );
}