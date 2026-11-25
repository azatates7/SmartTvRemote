import { NativeTabs } from 'expo-router/native-tabs';

import { Colors } from '@/constants/theme';
import { useTranslation } from '@/i18n';

/**
 * Uygulamanın alt sekme çubuğudur: Ana Sayfa, Rehber, Kumanda, Uygulamalar ve Ayarlar (AGENTS.md, 1. aşama).
 * İkonlar iOS'ta SF Symbols, Android'de Material simgeleridir; hiçbir TV markasının görseli kullanılmaz.
 * Sekme adları uygulama diline göre (Türkçe veya İngilizce) gösterilir.
 */
export default function AppTabs() {
  const { t } = useTranslation();

  return (
    <NativeTabs
      backgroundColor={Colors.backgroundElement}
      indicatorColor={Colors.backgroundSelected}
      tintColor={Colors.accent}
      iconColor={{ default: Colors.textSecondary, selected: Colors.accent }}
      labelStyle={{
        default: { color: Colors.textSecondary },
        selected: { color: Colors.text },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="guide">
        <NativeTabs.Trigger.Label>{t('tabs.guide')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet.rectangle" md="live_tv" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="remote">
        <NativeTabs.Trigger.Label>{t('tabs.remote')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="av.remote" md="settings_remote" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="apps">
        <NativeTabs.Trigger.Label>{t('tabs.apps')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="apps" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{t('tabs.settings')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}