import type { ImageSourcePropType } from 'react-native';

import type { DialAppId } from '@/protocols/smart-center/dial-apps';

/**
 * Optional official app logos. The project ships none: third-party logos are trademarks and must be
 * obtained from each brand's official brand-resources page and used under its guidelines.
 *
 * To use a logo: put a square PNG (e.g. 256×256) in `assets/app-logos/`, then uncomment its line.
 * Apps without an entry fall back to the letter badge. See assets/app-logos/README.md.
 */
export const APP_LOGOS: Partial<Record<DialAppId, ImageSourcePropType>> = {
  // YouTube: require('@/assets/app-logos/youtube.png'),
  // Netflix: require('@/assets/app-logos/netflix.png'),
  // AmazonInstantVideo: require('@/assets/app-logos/prime-video.png'),
  // TOD: require('@/assets/app-logos/tod.png'),
};