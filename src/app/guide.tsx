import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { useTranslation } from '@/i18n';

export default function GuideScreen() {
  const { t } = useTranslation();

  return (
    <Screen title={t('guide.title')}>
      <EmptyState
        title={t('guide.unsupported.title')}
        message={t('guide.unsupported.message')}
      />
    </Screen>
  );
}