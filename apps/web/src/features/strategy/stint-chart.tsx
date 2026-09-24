'use client'

import { findDriver, stintsFor } from '@unbox-box/tools'
import { SaveImageButton } from '@/components/save-image-button'
import type { RaceData } from '@/lib/types'
import { DriverStripe } from '@/components/driver-marks'
import { compoundBg, compoundName } from '@/lib/tyres'
import { Hint } from '@/components/ui/hint'
import { CompoundTyre } from '@/components/icons/compound-tyre'
import { StrategyIcon } from '@/components/icons'
import { Card, CardAction, CardHeader, CardTitle } from '@/components/ui/card'
import { useApp } from '@/lib/store'
import { useDriverColor } from '@/lib/use-team-colors'
import { cn } from '@/lib/utils'

/** Classic strategy chart: one row per driver in finishing order, one bar per stint. */
export function StintChart({ meta, replay }: RaceData) {
  const duel = useApp((s) => s.duel)
  const colorOf = useDriverColor()
  const simDriver = useApp((s) => s.strategy.simDriver)
  const total = replay.totalLaps
  const pct = (lap: number) => `${((lap - 1) / total) * 100}%`
  const ticks = [1, 10, 20, 30, 40, 50].filter((l) => l <= total)
  const used = [...new Set(Object.values(replay.stints).flatMap((s) => s.map((x) => x.compound)))]

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <StrategyIcon />
          Tyre strategies
        </CardTitle>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {used.map((c) => (
            <span key={c} className="flex items-center gap-1.5">
              <CompoundTyre compound={c} className="size-3.5" />
              {compoundName(c)}
            </span>
          ))}
        </div>
        <CardAction>
          <SaveImageButton name="Tyre strategies" />
        </CardAction>
      </CardHeader>
      <div className="px-4 pb-4">
        <div className="ml-12 flex justify-between pb-1 font-mono text-[10px] text-faint-foreground">
          <div className="relative h-3 w-full">
            {ticks.map((t) => (
              <span key={t} className="absolute -translate-x-1/2" style={{ left: pct(t) }}>
                L{t}
              </span>
            ))}
          </div>
        </div>
        <ol className="grid gap-1" aria-label="Tyre stints by driver">
          {replay.classification.map((c) => {
            const stints = stintsFor(replay, c.driver)
            const focus = c.driver === duel?.a || c.driver === duel?.b || c.driver === simDriver
            const name = findDriver(meta, c.driver)?.lastName ?? c.driver
            return (
              <li key={c.driver} className="flex items-center gap-2">
                <Hint label={`P${c.position} ${name}, ${c.status}`}>
                  <span
                    className={cn(
                      'flex w-12 shrink-0 items-center gap-1.5 font-mono text-xs',
                      focus ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <DriverStripe color={colorOf(c.driver)} />
                    {c.driver}
                  </span>
                </Hint>
                <div className="relative h-5 flex-1 rounded-sm bg-surface-2">
                  {stints.map((s) => (
                    <Hint
                      key={`${s.from}-${s.compound}`}
                      label={`${c.driver}: ${compoundName(s.compound)} laps ${s.from}–${s.to}${s.startAge ? ` (used, ${s.startAge} laps old)` : ''}`}
                    >
                      <div
                        className={cn(
                          'absolute inset-y-0 flex items-center overflow-hidden rounded-[3px] border-r-2 border-surface-1 pl-1.5',
                          compoundBg(s.compound),
                          !focus && 'opacity-80',
                        )}
                        style={{
                          left: pct(s.from),
                          width: `calc(${((s.to - s.from + 1) / total) * 100}%)`,
                        }}
                      >
                        {s.to - s.from >= 6 && (
                          <span className="font-mono text-[10px] font-semibold text-black/75">
                            {s.compound[0]}
                            {s.to - s.from + 1}
                          </span>
                        )}
                      </div>
                    </Hint>
                  ))}
                </div>
                <span className="w-9 shrink-0 text-right font-mono text-[10px] text-faint-foreground">
                  {c.status === 'Finished' ? `P${c.position}` : c.status}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </Card>
  )
}
