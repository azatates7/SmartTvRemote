/**
 * Design tokens. The app uses a single dark theme inspired by the reference screenshots
 * (near-black surfaces, restrained green accent, high-contrast text). See AGENTS.md, Phase 1.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  /** Screen background */
  background: '#0B0C0D',
  /** Cards, rows, tab bar */
  backgroundElement: '#17191B',
  /** Pressed / selected surfaces */
  backgroundSelected: '#23272A',
  border: '#2A2E31',
  text: '#F2F4F3',
  textSecondary: '#A3AAA7',
  /** Brand accent (original color, not taken from any vendor branding) */
  accent: '#4CC38A',
  danger: '#F2555A',
} as const;

export type ThemeColor = keyof typeof Colors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  card: 16,
} as const;

/** Minimum touch target (Android 48dp, iOS 44pt — use the larger). */
export const MinTouchTarget = 48;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;