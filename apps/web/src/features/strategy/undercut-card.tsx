'use client'

import { undercut, undercutWindow, type UndercutWindowCell } from '@unbox-box/tools'
import { m } from 'motion/react'
import { useMemo } from 'react'
import { Hint } from '@/components/ui/hint'
import { StatTile } from '@/components/stat-tile'
import { F1CarIcon } from '@/components/icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { LapSlider, type StrategyCardProps } from './shared'

const CELL: Record<UndercutWindowCell['status'], string> = {
  works: 'bg-success/70',
  short: 'bg-danger/45',
  ahead: 'bg-surface-3',
  unavailable: 'bg-transparent border border-dashed',
}

/** Every lap the attacker could have pitted, coloured by whether the undercut works. */
function UndercutWindow({
  cells,
  lap,
  onPick,
  attacker,
}: {
  cells: UndercutWindowCell[]
  lap: number
  onPick(lap: number): void
  attacker: string
}) {
  const works = cells.filter((c) => c.status === 'works')
  const label = (c: UndercutWindowCell) =>
    c.status === 'works'
      ? `L${c.lap}: works by ${c.margin.toFixed(1)}s`
      : c.status === 'short'
        ? `L${c.lap}: short by ${Math.abs(c.margin).toFixed(1)}s`
        : c.status === 'ahead'
          ? `L${c.lap}: ${attacker} already ahead`
          : `L${c.lap}: no data`
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label text-muted-foreground">Undercut window</span>
        <span className="numeric text-caption text-muted-foreground">
          {works.length
            ? `works on ${works.length} lap${works.length === 1 ? '' : 's'}`
            : 'never works'}
        </span>
      </div>
      <div className="flex h-7 gap-px" role="group" aria-label="Undercut result for every lap">
        {cells.map((c) => (
          <Hint key={c.lap} label={label(c)}>
            <button
              type="button"
              onClick={() => onPick(c.lap)}
              aria-label={label(c)}
              aria-pressed={c.lap === lap}
              className={cn(
                'min-w-0 flex-1 rounded-[2px] transition-transform hover:scale-y-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                CELL[c.status],
                c.lap === lap && 'ring-2 ring-signal ring-offset-1 ring-offset-surface-1',
              )}
            />
          </Hint>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-[2px] bg-success/70" /> works
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-[2px] bg-danger/45" /> falls short
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-[2px] bg-surface-3" /> already ahead
        </span>
        <span className="ml-auto">tap a lap to check it</span>
      </div>
    </div>
  )
}

export function UndercutCard({ meta, replay, model }: StrategyCardProps) {
  const strategy = useApp((s) => s.strategy)
  const setStrategy = useApp((s) => s.setStrategy)
  const drivers = replay.classification.filter((c) => c.laps > 0)
  const attacker = strategy.attacker ?? replay.classification[2]?.driver ?? 'PIA'
  const defender = strategy.defender ?? replay.classification[1]?.driver ?? 'NOR'
  const lap = strategy.undercutLap ?? 20

  const outcome = useMemo(() => {
    try {
      return { result: undercut(meta, replay, model, attacker, defender, lap), error: null }
    } catch (e) {
      return { result: null, error: (e as Error).message }
    }
  }, [meta, replay, model, attacker, defender, lap])

  const pick = (key: 'attacker' | 'defender', value: string) => (
    <Select value={value} onValueChange={(v) => setStrategy({ [key]: v })}>
      <SelectTrigger
        aria-label={key === 'attacker' ? 'Attacker' : 'Defender'}
        className="w-24 font-mono"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {drivers.map((c) => (
          <SelectItem key={c.driver} value={c.driver}>
            <span className="font-mono">{c.driver}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const windowCells = useMemo(
    () => undercutWindow(meta, replay, model, attacker, defender),
    [meta, replay, model, attacker, defender],
  )
  const r = outcome.result
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <F1CarIcon />
          Undercut check
        </CardTitle>
        <CardDescription>attacker pits a lap earlier</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {pick('attacker', attacker)}
          <span className="text-muted-foreground">attacks</span>
          {pick('defender', defender)}
        </div>
        <LapSlider
          id="undercut-lap"
          label="Attacker pits at the end of"
          value={lap}
          min={1}
          max={replay.totalLaps - 3}
          onChange={(v) => setStrategy({ undercutLap: v })}
        />
        {r ? (
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              <StatTile
                label="Gap before"
                value={`${r.gapBefore.toFixed(1)}s`}
                detail={`end of L${r.lap}`}
              />
              <StatTile
                label="After both stops"
                value={
                  <m.span
                    key={r.gapAfter.toFixed(1)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={r.works ? 'text-success' : 'text-danger'}
                  >
                    {r.works ? `−${r.margin.toFixed(1)}s` : `+${Math.abs(r.gapAfter).toFixed(1)}s`}
                  </m.span>
                }
                detail={r.works ? `${r.attacker} ahead` : `${r.attacker} still behind`}
              />
              <StatTile
                label="Pit loss"
                value={`${model.pitLoss.toFixed(1)}s`}
                detail={`both onto ${r.compound.toLowerCase()}s`}
              />
            </div>
            <p className="text-sm">
              <span className={cn('font-medium', r.works ? 'text-success' : 'text-danger')}>
                {r.works ? 'The undercut works.' : 'The undercut falls short.'}
              </span>{' '}
              <span className="text-muted-foreground">
                Fresh tyres for {r.attacker} against {r.defender}&apos;s extra lap on old ones.
              </span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{outcome.error}</p>
        )}
        <UndercutWindow
          cells={windowCells}
          lap={lap}
          onPick={(l) => setStrategy({ undercutLap: l })}
          attacker={attacker}
        />
      </CardContent>
    </Card>
  )
}
