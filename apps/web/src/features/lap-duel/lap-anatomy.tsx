'use client'

import {
  deletedLaps,
  formatLapTime,
  idealLap,
  pedalPhases,
  speedTraps,
  type DuelSide,
} from '@unbox-box/tools'
import { useMemo } from 'react'
import { StatTile } from '@/components/stat-tile'
import { DuelDot } from '@/components/driver-marks'
import { HelpText } from '@/components/help-text'
import { StopwatchIcon } from '@/components/icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Hint } from '@/components/ui/hint'
import { cn } from '@/lib/utils'
import type { DuelData } from './use-duel'

const PHASES = [
  { key: 'fullThrottle', label: 'Flat out', className: 'bg-success/80' },
  { key: 'partial', label: 'Part throttle', className: 'bg-tyre-medium/80' },
  { key: 'coasting', label: 'Coasting', className: 'bg-faint-foreground/70' },
  { key: 'braking', label: 'Braking', className: 'bg-danger/80' },
] as const

const pct = (v: number) => `${(v * 100).toFixed(0)}%`

/** How each lap was built: time left on the table (ideal vs actual), top speed, and where the
 *  lap was spent on each pedal, including lift-and-coast before braking zones. */
export function LapAnatomy({ data }: { data: DuelData }) {
  const { meta, telA, telB, lapA, lapB } = data
  const traps = useMemo(() => speedTraps(meta), [meta])
  const deleted = useMemo(() => deletedLaps(meta), [meta])
  const sides = useMemo(
    () =>
      (
        [
          ['a', telA, lapA],
          ['b', telB, lapB],
        ] as const
      ).map(([side, tel, lap]) => ({
        side: side as DuelSide,
        driver: tel.driver,
        lap,
        ideal: idealLap(meta, tel.driver),
        phases: pedalPhases(tel, meta.telemetry.step),
        trap: traps.findIndex((t) => t.driver === tel.driver),
      })),
    [meta, telA, telB, lapA, lapB, traps],
  )

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="grid gap-0.5">
          <CardTitle>
            <StopwatchIcon />
            Lap anatomy
          </CardTitle>
          <CardDescription>ideal lap, top speed and where the lap is spent</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="grid gap-3 @min-[1080px]:grid-cols-2">
          {sides.map((s) => {
            const gain =
              s.ideal.ideal != null && s.ideal.best ? s.ideal.best.time - s.ideal.ideal : null
            const trap = traps[s.trap]
            const zones = s.phases.coastZones.length
            return (
              <div key={s.side} className="grid content-start gap-3 rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-mono font-semibold">
                    <DuelDot side={s.side} />
                    {s.driver}
                  </span>
                  <span className="numeric text-xs text-muted-foreground">
                    L{s.lap.lap} · {s.lap.time != null ? formatLapTime(s.lap.time) : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <StatTile
                    label="Ideal lap"
                    value={
                      <span className="text-base">
                        {s.ideal.ideal != null ? formatLapTime(s.ideal.ideal) : '—'}
                      </span>
                    }
                    detail="best sectors"
                  />
                  <StatTile
                    label="Time lost"
                    value={
                      <span className="text-base">
                        {gain != null ? `${gain.toFixed(3)}s` : '—'}
                      </span>
                    }
                    detail="vs ideal"
                  />
                  <StatTile
                    label="Speed trap"
                    value={<span className="text-base">{trap ? trap.speed : '—'}</span>}
                    detail={trap ? `P${s.trap + 1} of ${traps.length}` : undefined}
                  />
                </div>
                <div className="grid gap-2">
                  <div
                    className="flex h-2.5 overflow-hidden rounded-full"
                    role="img"
                    aria-label={PHASES.map((p) => `${p.label} ${pct(s.phases[p.key])}`).join(', ')}
                  >
                    {PHASES.map((p) => (
                      <Hint key={p.key} label={`${p.label}: ${pct(s.phases[p.key])} of the lap`}>
                        <span
                          className={cn('h-full', p.className)}
                          style={{ width: pct(s.phases[p.key]) }}
                        />
                      </Hint>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-caption text-muted-foreground">
                    {PHASES.map((p) => (
                      <span key={p.key} className="flex items-center gap-1.5">
                        <span className={cn('size-2 rounded-full', p.className)} aria-hidden />
                        {p.label}
                        <span className="ml-auto numeric text-foreground">
                          {pct(s.phases[p.key])}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-caption text-muted-foreground">
                  <span>Lift and coast</span>
                  <span className="numeric text-foreground">
                    {zones} zone{zones === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        <HelpText>
          The ideal lap stitches together each driver&apos;s best three sectors of the session.
          Coasting means off both pedals for at least 15 m.
          {deleted.length > 0 &&
            ` ${deleted.length} lap${deleted.length === 1 ? ' was' : 's were'} deleted this session and never count.`}
        </HelpText>
      </CardContent>
    </Card>
  )
}
