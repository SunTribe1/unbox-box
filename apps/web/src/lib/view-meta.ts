import type { View } from '@unbox-box/tools'

/** Page titles and search descriptions for each view's static page. The titles match the
 *  navigation labels (checked in test/nav.test.ts). */
export const VIEW_META: Record<View, { title: string; description: string }> = {
  'lap-duel': {
    title: 'Lap Duel',
    description:
      'Compare any two F1 laps corner by corner: speed, throttle, brake, gear and the running gap.',
  },
  replay: {
    title: 'Race Replay',
    description:
      'Replay a whole Grand Prix on the track map with a live timing tower and race control.',
  },
  strategy: {
    title: 'Strategy Lab',
    description:
      'Tyre stints, pit stops, degradation, undercuts and a race simulator for every F1 race since 2023.',
  },
  history: {
    title: 'History Explorer',
    description: 'Head-to-heads and profiles for every Formula 1 driver and team since 1950.',
  },
  races: {
    title: 'Race Archive',
    description:
      'Every Formula 1 weekend since 1950: results, qualifying, grids, sprints, practice and pit stops.',
  },
  circuits: {
    title: 'Circuits',
    description:
      'Every Formula 1 circuit: layouts, corners, lap records and most successful drivers.',
  },
  records: {
    title: 'Record Book',
    description:
      'Formula 1 records by decade: wins, poles, streaks, youngest winners, closest finishes.',
  },
  engines: {
    title: 'Engines & Tyres',
    description:
      'Every F1 engine and tyre maker: who they supplied, what they built and how they did.',
  },
  nations: {
    title: 'Nations',
    description: 'Formula 1 drivers, champions, teams and circuits by country.',
  },
  help: {
    title: 'Help & feedback',
    description:
      'How to use Unbox Box, what its colours mean, how it is built, and how to report a bug.',
  },
}
