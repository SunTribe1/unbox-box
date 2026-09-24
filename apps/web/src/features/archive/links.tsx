'use client'

import type { HistoryData } from '@unbox-box/tools'
import type * as React from 'react'
import { Flag } from '@/components/flag'
import { useApp } from '@/lib/store'
import { teamColor } from '@/lib/teams'
import { useThemeName } from '@/lib/use-team-colors'
import { cn } from '@/lib/utils'
import { goTo } from '../shell/nav'

/** Cross-links between the archive pages: every name opens its profile. */

export function openDriver(data: HistoryData, driver: number) {
  const id = data.index.drivers[driver]?.id
  if (!id) return
  useApp.getState().setHistory({ tab: 'drivers', driver: id })
  goTo('history')
}

export function openTeam(data: HistoryData, team: number) {
  const id = data.index.constructors[team]?.id
  if (!id) return
  useApp.getState().setHistory({ tab: 'teams', team: id })
  goTo('history')
}

export function openRace(year: number, round: number, session = 'race') {
  useApp.getState().setArchive({ season: year, round, session })
  goTo('races')
}

export function openCircuit(data: HistoryData, circuit: number) {
  const id = data.index.circuits[circuit]?.id
  if (!id) return
  useApp.getState().setCircuit(id)
  goTo('circuits')
}

export function openNation(code: string) {
  useApp.getState().setArchive({ nation: code.toUpperCase() })
  goTo('nations')
}

const linkClass =
  'inline-flex min-w-0 items-center gap-1.5 rounded-sm text-left font-sans tracking-normal hover:text-signal-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

/** A driver's flag and name; opens their profile. */
export function DriverLink({
  data,
  driver,
  short,
  className,
}: {
  data: HistoryData
  driver: number | undefined
  /** Last name only, for tight tables. */
  short?: boolean
  className?: string
}) {
  const d = driver != null ? data.index.drivers[driver] : undefined
  if (!d) return <span className="text-muted-foreground">—</span>
  return (
    <button
      type="button"
      onClick={() => openDriver(data, driver!)}
      className={cn(linkClass, className)}
    >
      <Flag code={d.code} />
      <span className="truncate">{short ? d.lastName : d.name}</span>
    </button>
  )
}

/** A team's colour mark and name; opens its profile. */
export function TeamLink({
  data,
  team,
  className,
  children,
}: {
  data: HistoryData
  team: number | undefined
  className?: string
  children?: React.ReactNode
}) {
  const theme = useThemeName()
  const t = team != null && team >= 0 ? data.index.constructors[team] : undefined
  if (!t) return <span className="text-muted-foreground">—</span>
  return (
    <button
      type="button"
      onClick={() => openTeam(data, team!)}
      className={cn(linkClass, className)}
    >
      <span
        className="h-3.5 w-[3px] shrink-0 rounded-full"
        style={{ backgroundColor: teamColor(t.name, theme) }}
        aria-hidden
      />
      <span className="truncate">{children ?? t.name}</span>
    </button>
  )
}
