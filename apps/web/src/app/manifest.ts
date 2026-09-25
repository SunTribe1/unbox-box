import type { MetadataRoute } from 'next'
import { BRAND_BACKGROUND } from '@/lib/brand'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Unbox Box',
    short_name: 'Unbox Box',
    description:
      'F1 analysis you can drive: lap duels, race replays, strategy what-ifs and every Grand Prix since 1950. Unofficial fan project.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: BRAND_BACKGROUND.dark,
    theme_color: BRAND_BACKGROUND.dark,
    categories: ['sports', 'entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Lap Duel', url: '/duel/' },
      { name: 'Race Replay', url: '/replay/' },
      { name: 'Strategy Lab', url: '/strategy/' },
      { name: 'History Explorer', url: '/history/' },
      { name: 'Race Archive', url: '/races/' },
      { name: 'Circuits', url: '/circuits/' },
      { name: 'Record Book', url: '/records/' },
    ],
  }
}
