'use client'

import {
  type Driver,
  type DuelSide,
  findDriver,
  findResult,
  formatGap,
  formatLapTime,
  type Lap,
  lapStats,
} from '@unbox-box/tools'
import { GaugeIcon } from 'lucide-react'
import type * as React from 'react'
import { useMemo } from 'react'
import { DUEL_BG, DuelDot } from '@/components/driver-marks'
import { HelmetIcon, StopwatchIcon } from '@/components/icons'
import { GrowBar } from '@/components/ui/grow-bar'
import { compoundName } from '@/lib/tyres'
import { CompoundTyre } from '@/components/icons/compound-tyre'
import { Card } from '@/components/ui/card'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { cn } from '@/lib/utils'

const formatInt = (v: number) => String(Math.round(v))
const formatPercent = (v: number) => `${Math.round(v)}%`
import type { DuelData } from './use-duel'

function Tyre({ compound }: { compound: string | null }) {
  if (!compound) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CompoundTyre compound={compound} />
      {compoundName(compound)}
    </span>
  )
}

function IconBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 [&_svg]:size-5',
        className,
      )}
      aria-hidden
    >
      {children}
    </span>
  )
}

function DriverCard({
  side,
  driver,
  lap,
  position,
  field,
}: {
  side: DuelSide
  driver?: Driver
  lap: Lap
  position?: number
  field: number
}) {
  return (
    <Card className="@container/driver relative overflow-hidden p-4">
      <div className="grid h-full gap-3 @min-[300px]/driver:grid-cols-[minmax(0,1fr)_auto]">
        <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', DUEL_BG[side])} />
        <div className="grid min-w-0 content-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <IconBadge className={side === 'a' ? 'text-driver-a' : 'text-driver-b'}>
              <HelmetIcon />
            </IconBadge>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {driver ? `${driver.firstName} ${driver.lastName}` : lap.lap}
              </div>
              <div className="truncate text-xs text-muted-foreground">{driver?.team}</div>
            </div>
            {position && (
              <span className="ml-auto shrink-0 rounded-md bg-surface-2 px-2 py-1 numeric text-sm font-semibold @min-[300px]/driver:hidden">
                P{position}
              </span>
            )}
          </div>
          <div className="grid gap-1">
            <div className="font-mono text-2xl font-semibold tracking-tight">
              <AnimatedNumber value={lap.time} format={formatLapTime} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="numeric">L{lap.lap}</span>
              {lap.segment && <span className="font-mono">{lap.segment}</span>}
              <Tyre compound={lap.compound} />
            </div>
          </div>
        </div>
        {position && (
          <div className="hidden flex-col items-end justify-between border-l pl-3 text-right @min-[300px]/driver:flex">
            <span className="text-label text-muted-foreground">Result</span>
            <span className="numeric text-4xl leading-none font-semibold tracking-tight">
              P{position}
            </span>
            <span className="numeric text-caption text-muted-foreground">of {field}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

const formatSigned = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(3)}`

export function StatCards({ data }: { data: DuelData }) {
  const { meta, lapA, lapB, telA, telB } = data
  const driver = (code: string) => findDriver(meta, code)
  const position = (code: string) => findResult(meta, code)?.position
  const gap = (lapB.time ?? 0) - (lapA.time ?? 0)
  const stats = useMemo(() => ({ a: lapStats(telA), b: lapStats(telB) }), [telA, telB])
  const ahead = gap >= 0 ? telA.driver : telB.driver
  // Per sector, positive = A faster (same sign as the lap gap).
  const sectors = (['s1', 's2', 's3'] as const).map((k) =>
    lapA[k] != null && lapB[k] != null ? lapB[k]! - lapA[k]! : null,
  )
  const topMax = Math.max(stats.a.topSpeed, stats.b.topSpeed, 1)
  const topMin = Math.min(stats.a.topSpeed, stats.b.topSpeed) - 15

  return (
    // From 1080px the columns match the grid below (charts | 360px map), so the Gap card
    // ends where the charts end and Top speed sits over the track map.
    <div className="grid gap-4 @min-[560px]:grid-cols-2 @min-[1080px]:grid-cols-[repeat(3,minmax(0,1fr))_360px]">
      <DriverCard
        side="a"
        driver={driver(telA.driver)}
        lap={lapA}
        position={position(telA.driver)}
        field={meta.results.length}
      />
      <DriverCard
        side="b"
        driver={driver(telB.driver)}
        lap={lapB}
        position={position(telB.driver)}
        field={meta.results.length}
      />
      <Card className="grid content-between gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <IconBadge className="text-muted-foreground">
            <StopwatchIcon />
          </IconBadge>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Gap</div>
            <div className="truncate text-xs text-muted-foreground">{ahead} ahead over the lap</div>
          </div>
        </div>
        <div className="font-mono text-2xl font-semibold tracking-tight">
          <AnimatedNumber value={Math.abs(gap)} format={formatGap} />
        </div>
        <div className="grid grid-cols-3 gap-1.5" aria-label="Gap by sector">
          {sectors.map((d, i) => (
            <div key={i} className="grid gap-0.5 rounded-md bg-surface-2 px-2 py-1.5 text-center">
              <span className="text-[10px] font-medium text-muted-foreground">S{i + 1}</span>
              <span
                className={cn(
                  'numeric text-xs font-medium',
                  d == null
                    ? 'text-faint-foreground'
                    : d > 0
                      ? 'text-driver-a-ink'
                      : d < 0
                        ? 'text-driver-b-ink'
                        : '',
                )}
              >
                {d == null ? '—' : formatSigned(d)}
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="grid content-between gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <IconBadge className="text-muted-foreground">
            <GaugeIcon strokeWidth={1.5} />
          </IconBadge>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Top speed</div>
            <div className="truncate text-xs text-muted-foreground">
              and share of the lap flat out
            </div>
          </div>
        </div>
        <div className="grid gap-2.5">
          {(['a', 'b'] as const).map((side) => (
            <div key={side} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-2 numeric text-sm">
                <span className="flex items-center gap-1.5 font-mono">
                  <DuelDot side={side} className="size-2" />
                  {side === 'a' ? telA.driver : telB.driver}
                </span>
                <span>
                  <AnimatedNumber value={stats[side].topSpeed} format={formatInt} />{' '}
                  <span className="text-faint-foreground">km/h</span>
                  <span className="ml-2 text-muted-foreground">
                    <AnimatedNumber value={stats[side].fullThrottle * 100} format={formatPercent} />
                  </span>
                </span>
              </div>
              <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <GrowBar
                  value={(stats[side].topSpeed - topMin) / (topMax - topMin)}
                  className={cn('rounded-full', DUEL_BG[side])}
                />
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
