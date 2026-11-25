import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { APP_LOGOS } from '@/constants/app-logos';
import { Colors } from '@/constants/theme';
import type { DialAppId } from '@/protocols/smart-center/dial-apps';

/**
 * TV uygulaması için ikon gösterir.
 * `constants/app-logos.ts` dosyasına o uygulama için bir logo eklendiyse logoyu kullanır.
 * Logo yoksa uygulama adının ilk harfini turuncu (tema vurgu rengi) dolgulu bir rozet içinde gösterir, örneğin YouTube için "Y".
 * Ekran okuyucular rozeti atlar, çünkü uygulamanın adı hemen yanında zaten okunur.
 */
export function AppBadge({ appId, label, size = 40 }: { appId: DialAppId; label: string; size?: number }) {
  const radius = size * 0.28;
  const logo = APP_LOGOS[appId];

  if (logo) {
    return (
      <Image
        source={logo}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    );
  }

  const letter = label.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: radius }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <ThemedText
        type="smallBold"
        style={[styles.letter, { fontSize: size * 0.48, lineHeight: size * 0.6 }]}>
        {letter}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  letter: {
    color: Colors.background,
  },
});