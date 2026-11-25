import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

/**
 * Arka planını temadan alan görünüm bileşenidir.
 * `type` temadaki arka plan rengini seçer (ör. kartlar için `backgroundElement`); verilmezse ekran arka planı kullanılır.
 * `lightColor` ve `darkColor` Expo şablonundan kalmadır ve uygulama tek (koyu) tema kullandığı için dikkate alınmaz.
 */
export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  return <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps} />;
}