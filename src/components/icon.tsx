import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { Colors } from '@/constants/theme';

/** App icon names → SF Symbols (iOS) and Material Symbols (Android). Generic glyphs only, no brand logos. */
const ICONS = {
  up: { ios: 'chevron.up', android: 'keyboard_arrow_up' },
  down: { ios: 'chevron.down', android: 'keyboard_arrow_down' },
  left: { ios: 'chevron.left', android: 'keyboard_arrow_left' },
  right: { ios: 'chevron.right', android: 'keyboard_arrow_right' },
  back: { ios: 'arrow.uturn.backward', android: 'undo' },
  home: { ios: 'house', android: 'home' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  stop: { ios: 'stop.fill', android: 'stop' },
  mute: { ios: 'speaker.slash.fill', android: 'volume_off' },
  power: { ios: 'power', android: 'power_settings_new' },
  close: { ios: 'xmark', android: 'close' },
  apps: { ios: 'square.grid.2x2', android: 'apps' },
  search: { ios: 'magnifyingglass', android: 'search' },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 24,
  color = Colors.text,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  const { ios, android } = ICONS[name];
  // expo-symbols reads `android` on Android and `web` on web; both use Material Symbols.
  return <SymbolView name={{ ios, android, web: android }} size={size} tintColor={color} />;
}