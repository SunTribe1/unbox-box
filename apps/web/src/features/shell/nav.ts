import { ensureRace, type View } from '@unbox-box/tools'
import {
  CircuitIcon,
  EngineIcon,
  GlobeIcon,
  LapDuelIcon,
  MedalIcon,
  RaceArchiveIcon,
  ReplayIcon,
  StrategyIcon,
  TrophyIcon,
} from '@/components/icons'
import { CircleHelpIcon } from 'lucide-react'
import type * as React from 'react'
import { toast } from 'sonner'
import { browserContext } from '@/lib/context'
import { useApp } from '@/lib/store'

export interface NavItem {
  view: View
  label: string
  short: string
  icon: React.ElementType
  /** Session views analyse the loaded session; archive views cover every season since 1950. */
  group: 'session' | 'archive' | 'meta'
  /** One line for the phone "More" sheet. */
  blurb: string
}

/** The views, shared by the desktop rail and the mobile tab bar. */
export const NAV: NavItem[] = [
  {
    view: 'lap-duel',
    label: 'Lap Duel',
    short: 'Duel',
    icon: LapDuelIcon,
    group: 'session',
    blurb: 'Two laps, trace by trace',
  },
  {
    view: 'replay',
    label: 'Race Replay',
    short: 'Replay',
    icon: ReplayIcon,
    group: 'session',
    blurb: 'Every car, lap by lap',
  },
  {
    view: 'strategy',
    label: 'Strategy Lab',
    short: 'Strategy',
    icon: StrategyIcon,
    group: 'session',
    blurb: 'Tyres, stops and undercuts',
  },
  {
    view: 'history',
    label: 'History Explorer',
    short: 'History',
    icon: TrophyIcon,
    group: 'archive',
    blurb: 'Drivers, teams, seasons, head to head',
  },
  {
    view: 'races',
    label: 'Race Archive',
    short: 'Races',
    icon: RaceArchiveIcon,
    group: 'archive',
    blurb: 'Every weekend since 1950, every session',
  },
  {
    view: 'circuits',
    label: 'Circuits',
    short: 'Circuits',
    icon: CircuitIcon,
    group: 'archive',
    blurb: 'Layouts, lap records and winners',
  },
  {
    view: 'records',
    label: 'Record Book',
    short: 'Records',
    icon: MedalIcon,
    group: 'archive',
    blurb: 'Leaderboards for every stat',
  },
  {
    view: 'engines',
    label: 'Engines & Tyres',
    short: 'Engines',
    icon: EngineIcon,
    group: 'archive',
    blurb: 'Who powered and shod the winners',
  },
  {
    view: 'nations',
    label: 'Nations',
    short: 'Nations',
    icon: GlobeIcon,
    group: 'archive',
    blurb: 'Drivers, teams and tracks by country',
  },
  {
    view: 'help',
    label: 'Help & feedback',
    short: 'Help',
    icon: CircleHelpIcon,
    group: 'meta',
    blurb: 'How to read every page; report a bug or idea',
  },
]

/** Phones show these in the tab bar; the rest sit behind "More". */
export const PRIMARY_VIEWS: View[] = ['lap-duel', 'replay', 'strategy', 'history']

/** Replay and Strategy need the race, so they load it for the current event first. */
export function goTo(view: View): void {
  if (view === 'replay' || view === 'strategy') {
    ensureRace(browserContext, view).catch((error: Error) =>
      toast.error(view === 'replay' ? 'Race replay unavailable' : 'Strategy Lab unavailable', {
        description: error.message,
      }),
    )
    return
  }
  useApp.getState().setView(view)
}

/** The logo's click inside the app: switch to Lap Duel in place, like the rail does. A real
 *  href stays on the link, so opening it in a new tab still works. */
export function openLapDuel(event: {
  preventDefault: () => void
  metaKey?: boolean
  ctrlKey?: boolean
}): void {
  if (event.metaKey || event.ctrlKey) return
  event.preventDefault()
  goTo('lap-duel')
}
