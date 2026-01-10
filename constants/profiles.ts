import type { Profile } from '../types';
import { GlobeIcon } from '../components/icons/GlobeIcon';
import { PuzzleIcon } from '../components/icons/PuzzleIcon';
import { PWaIcon } from '../components/icons/PwaIcon';
import { RulerIcon } from '../components/icons/RulerIcon';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getProfiles = (t: any): Profile[] => [
  {
    id: 'favicon',
    name: t.profileFaviconName,
    description: t.profileFaviconDescription,
    iconComponent: GlobeIcon,
    icons: [
      { width: 16, height: 16, filename: 'favicon-16x16.png' },
      { width: 32, height: 32, filename: 'favicon-32x32.png' },
      { width: 48, height: 48, filename: 'favicon-48x48.png' },
      { width: 180, height: 180, filename: 'apple-touch-icon.png' },
      { width: 192, height: 192, filename: 'android-chrome-192x192.png' },
      { width: 512, height: 512, filename: 'android-chrome-512x512.png' },
    ],
  },
  {
    id: 'chrome-extension',
    name: t.profileChromeName,
    description: t.profileChromeDescription,
    iconComponent: PuzzleIcon,
    icons: [
      { width: 16, height: 16, filename: 'icon16.png' },
      { width: 48, height: 48, filename: 'icon48.png' },
      { width: 128, height: 128, filename: 'icon128.png' },
    ],
  },
  {
    id: 'pwa',
    name: t.profilePwaName,
    description: t.profilePwaDescription,
    iconComponent: PWaIcon,
    icons: [
      { width: 72, height: 72, filename: 'icons/icon-72x72.png' },
      { width: 96, height: 96, filename: 'icons/icon-96x96.png' },
      { width: 128, height: 128, filename: 'icons/icon-128x128.png' },
      { width: 144, height: 144, filename: 'icons/icon-144x144.png' },
      { width: 152, height: 152, filename: 'icons/icon-152x152.png' },
      { width: 192, height: 192, filename: 'icons/icon-192x192.png' },
      { width: 384, height: 384, filename: 'icons/icon-384x384.png' },
      { width: 512, height: 512, filename: 'icons/icon-512x512.png' },
    ],
  },
  {
    id: 'custom',
    name: t.profileCustomName,
    description: t.profileCustomDescription,
    iconComponent: RulerIcon,
    icons: [],
  },
];