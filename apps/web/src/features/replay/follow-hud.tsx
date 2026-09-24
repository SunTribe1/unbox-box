'use client'

import { findDriver, formatLapTime, liveLap, standingsAt, type SectorMark } from '@unbox-box/tools'
import { useMemo } from 'react'
import { DriverStripe } from '@/components/driver-marks'
import { SteeringWheelIcon } from '@/components/icons'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { Hint } from '@/components/ui/hint'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useApp, usePlayback } from '@/lib/store'
import type { RaceData } from '@/lib/types'
import { useDriverColor } from '@/lib/use-team-colors'
import { cn } from '@/lib/utils'
import { useThrottledTime } from './use-replay'

const MARK: Record<Exclude<SectorMark, null>, { className: string; label: string }> = {
  'session-best': { className: 'bg-sector-best/20 text-sector-best', label: 'fastest overall' },
  'personal-best': { className: 'bg-success/15 text-success', label: 'personal best' },
  slower: { className: 'bg-tyre-medium/15 text-foreground', label: 'slower' },
}

const formatSpeed = (v: number) => `${Math.round(v)}`

/** The followed car at a glance: place, live speed, and its last lap sector by sector in the
 *  timing-screen colours (purple overall best, green personal best, yellow slower). */
export function FollowHud({ meta, replay }: RaceData) {
  const time = useThrottledTime(250)
  const focus = usePlayback((s) => s.focus)
  const duelA = useApp((s) => s.duel?.a)
  const colorOf = useDriverColor()
  const standings = useMemo(() => standingsAt(replay, time), [replay, time])
  const driver = focus ?? duelA ?? standings[0]?.driver ?? ''
  const live = useMemo(() => liveLap(meta, replay, driver, time), [meta, replay, driver, time])
  const row = standings.find((s) => s.driver === driver)
  const name = findDriver(meta, driver)
  const running = row?.state === 'running'

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-0.5">
          <CardTitle>
            <SteeringWheelIcon />
            <span className="flex items-center gap-2">
              <DriverStripe color={colorOf(driver)} className="h-4" />
              {name ? `${name.firstName} ${name.lastName}` : driver}
            </span>
          </CardTitle>
          <CardDescription>
            {focus ? 'following' : duelA === driver ? 'Lap Duel driver A' : 'leader'} · tap a driver
            in Timing to switch
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-0.5 rounded-lg bg-surface-2 px-3 py-2">
            <span className="text-label text-muted-foreground">Place</span>
            <span className="numeric text-xl font-semibold">P{row?.position ?? '–'}</span>
          </div>
          <div className="grid gap-0.5 rounded-lg bg-surface-2 px-3 py-2">
            <span className="text-label text-muted-foreground">Lap</span>
            <span className="numeric text-xl font-semibold">
              {live.lap}
              <span className="text-sm text-muted-foreground">/{replay.totalLaps}</span>
            </span>
          </div>
          <div className="grid gap-0.5 rounded-lg bg-surface-2 px-3 py-2">
            <span className="text-label text-muted-foreground">Speed</span>
            <span className="numeric text-xl font-semibold">
              {running ? <AnimatedNumber value={live.speed} format={formatSpeed} /> : '–'}
              <span className="ml-1 text-xs text-muted-foreground">km/h</span>
            </span>
          </div>
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">
              Last lap{live.last ? ` · L${live.last.lap}` : ''}
            </span>
            <span className="numeric font-semibold">
              {live.last?.time != null ? formatLapTime(live.last.time) : '—'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5" aria-label="Last lap sectors">
            {[0, 1, 2].map((k) => {
              const mark = live.last?.marks[k] ?? null
              const value = live.last?.sectors[k]
              return (
                <Hint key={k} label={`Sector ${k + 1}: ${mark ? MARK[mark].label : 'no time'}`}>
                  <div
                    tabIndex={0}
                    className={cn(
                      'grid gap-0.5 rounded-md px-2 py-1.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      mark ? MARK[mark].className : 'bg-surface-2 text-muted-foreground',
                    )}
                  >
                    <span className="text-[10px] font-medium opacity-80">S{k + 1}</span>
                    <span className="numeric text-sm">
                      {value != null ? value.toFixed(3) : '—'}
                    </span>
                  </div>
                </Hint>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
