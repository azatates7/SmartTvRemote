import { NativeTabs } from 'expo-router/native-tabs';

import { Colors } from '@/constants/theme';
import { useTranslation } from '@/i18n';

/**
 * Five-tab information architecture (AGENTS.md Phase 1).
 * Icons: SF Symbols on iOS, Material icons on Android — no vendor artwork.
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