'use client'

import { simulateOneStop, stintsFor } from '@unbox-box/tools'
import { AlertTriangleIcon } from 'lucide-react'
import { m } from 'motion/react'
import { useEffect } from 'react'
import { StatTile } from '@/components/stat-tile'
import { HelpText } from '@/components/help-text'
import { compoundName } from '@/lib/tyres'
import { Field, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PitBoardIcon } from '@/components/icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApp } from '@/lib/store'
import { GrowBar } from '@/components/ui/grow-bar'
import { cn } from '@/lib/utils'
import { CompoundPicker, LapSlider, type StrategyCardProps } from './shared'

function trySimulate(...args: Parameters<typeof simulateOneStop>) {
  try {
    return simulateOneStop(...args)
  } catch {
    return null
  }
}

export function Simulator({ meta, replay, model }: StrategyCardProps) {
  const strategy = useApp((s) => s.strategy)
  const setStrategy = useApp((s) => s.setStrategy)
  const finishers = replay.classification.filter((c) => c.status === 'Finished')
  const driver = strategy.simDriver ?? finishers[1]?.driver ?? finishers[0]!.driver
  const firstStint = stintsFor(replay, driver)[0]
  const lap = strategy.simLap ?? Math.max(2, (firstStint?.to ?? 20) - 8)
  const compound = strategy.simCompound ?? (firstStint?.compound === 'HARD' ? 'MEDIUM' : 'HARD')

  useEffect(() => {
    if (!strategy.simDriver) setStrategy({ simDriver: driver, simLap: lap, simCompound: compound })
  }, [strategy.simDriver, driver, lap, compound, setStrategy])

  const sim = trySimulate(meta, replay, model, driver, lap, compound)

  const shown = sim
    ? sim.positions
        .map((p, i) => ({ pos: i + 1, p }))
        .filter((x) => x.p >= 0.005 || x.pos === sim.actualPosition)
    : []
  const maxP = Math.max(...shown.map((x) => x.p), 0.01)

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <PitBoardIcon />
          Pit stop simulator
        </CardTitle>
        <CardDescription>one stop · 500 simulated races</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 @min-[700px]:grid-cols-[auto_1fr]">
          <div className="grid content-start gap-3">
            <Field className="gap-1.5">
              <FieldLabel
                htmlFor="sim-driver"
                className="text-caption font-normal text-muted-foreground"
              >
                Driver
              </FieldLabel>
              <Select value={driver} onValueChange={(v) => setStrategy({ simDriver: v })}>
                <SelectTrigger id="sim-driver" className="w-full font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {finishers.map((c) => (
                    <SelectItem key={c.driver} value={c.driver}>
                      <span className="w-7 font-mono text-xs text-faint-foreground">
                        P{c.position}
                      </span>
                      <span className="font-mono">{c.driver}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field className="gap-1.5">
              <FieldTitle className="text-caption font-normal text-muted-foreground">
                New tyres
              </FieldTitle>
              <CompoundPicker
                value={compound}
                onChange={(v) => setStrategy({ simCompound: v })}
                label="New tyre compound"
              />
            </Field>
          </div>
          <LapSlider
            id="sim-lap"
            label="Pit on"
            value={lap}
            min={2}
            max={replay.totalLaps - 1}
            onChange={(v) => setStrategy({ simLap: v })}
          />
        </div>

        {firstStint && (
          <p className="text-xs text-muted-foreground">
            Real race:{' '}
            {stintsFor(replay, driver)
              .map((s) => `${compoundName(s.compound)} L${s.from}–${s.to}`)
              .join(' → ')}
            . Scenario: {compoundName(firstStint.compound)} L1–{lap} → {compoundName(compound)} L
            {lap + 1}–{replay.totalLaps}.
          </p>
        )}

        {sim ? (
          <div className="grid gap-4 @min-[700px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid grid-cols-2 content-start gap-2">
              <StatTile
                className="col-span-2"
                label="vs the real race"
                value={
                  <m.span
                    key={`${sim.delta.toFixed(1)}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'inline-block text-3xl tracking-tight',
                      sim.delta < 0 ? 'text-success' : 'text-danger',
                    )}
                  >
                    {sim.delta < 0 ? '−' : '+'}
                    {Math.abs(sim.delta).toFixed(1)}s
                  </m.span>
                }
                detail={sim.delta < 0 ? 'faster to the flag' : 'slower to the flag'}
              />
              <StatTile
                label="Likely finish"
                value={`P${sim.p50}`}
                detail={`real race: P${sim.actualPosition}`}
              />
              <StatTile
                label="80% of runs"
                value={sim.p90 !== sim.p10 ? `P${sim.p10}–P${sim.p90}` : `P${sim.p10}`}
                detail="500 simulated races"
              />
              {!sim.legal && (
                <Alert variant="destructive" className="col-span-2 px-3 py-2">
                  <AlertTriangleIcon />
                  <AlertDescription className="text-xs">
                    Illegal in the dry: two different compounds are required.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="grid content-start gap-2 rounded-lg bg-surface-2 p-3">
              <span className="text-label text-muted-foreground">Finishing position</span>
              <div
                className="flex h-28 items-end justify-center gap-3"
                role="img"
                aria-label={`Finishing position distribution: ${shown.map((x) => `P${x.pos} ${Math.round(x.p * 100)}%`).join(', ')}`}
              >
                {shown.map((x) => (
                  <div
                    key={x.pos}
                    className="flex h-full w-9 flex-col items-center justify-end gap-1"
                  >
                    <span className="numeric text-[10px] text-muted-foreground">
                      {Math.round(x.p * 100)}%
                    </span>
                    <span className="min-h-0 w-full flex-1">
                      <GrowBar
                        axis="y"
                        value={x.p / maxP}
                        className={cn(
                          'rounded-t-[4px]',
                          x.pos === sim.actualPosition ? 'bg-foreground/40' : 'bg-signal',
                        )}
                      />
                    </span>
                    <span className="numeric text-[11px]">P{x.pos}</span>
                  </div>
                ))}
              </div>
              <HelpText>
                Share of runs. Grey: the real result. Other drivers keep their real race times.
              </HelpText>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This driver didn&apos;t finish on the lead lap.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
