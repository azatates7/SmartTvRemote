import { Colors } from '@/constants/theme';

/** The app has a single dark theme; kept as a hook so a light theme can be added later without touching callers. */
export function useTheme() {
  return Colors;
}