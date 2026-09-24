'use client'

import { findDriver, gapHistory } from '@unbox-box/tools'
import { useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from 'recharts'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { SaveImageButton } from '@/components/save-image-button'
import type { RaceData } from '@/lib/types'
import { LapDuelIcon } from '@/components/icons'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useApp } from '@/lib/store'
import { useDriverColor } from '@/lib/use-team-colors'

const SCOPES = { top5: 5, top10: 10, all: 99 } as const
type Scope = keyof typeof SCOPES

const STATUS_FILL = { sc: 'var(--tyre-medium)', vsc: 'var(--tyre-medium)', red: 'var(--danger)' }

/** Race-long gap to the leader for each car, in team colors. Lines fanning out show the race
 *  spreading; lines bunching show safety cars; a line dropping is a pit stop. */
export function GapHistory({ meta, replay }: RaceData) {
  const [scope, setScope] = useState<Scope>('top10')
  const duel = useApp((s) => s.duel)
  const colorOf = useDriverColor()
  const reduce = useReducedMotion()

  const drivers = useMemo(() => {
    const finishers = meta.results.slice(0, SCOPES[scope]).map((r) => r.driver)
    for (const d of [duel?.a, duel?.b]) if (d && !finishers.includes(d)) finishers.push(d)
    return finishers
  }, [meta, scope, duel])
  const data = useMemo(() => gapHistory(replay, drivers), [replay, drivers])
  const lapStarts = useMemo(() => {
    const leader = meta.results[0]?.driver ?? ''
    return replay.lapStarts[leader] ?? []
  }, [meta, replay])
  const lapAt = (t: number) => {
    const i = lapStarts.findIndex((s) => s != null && s > t)
    return i === -1 ? replay.totalLaps : Math.max(1, i)
  }

  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        drivers.map((d) => [d, { label: findDriver(meta, d)?.lastName ?? d, color: colorOf(d) }]),
      ),
    [drivers, meta, colorOf],
  )
  const focus = new Set([duel?.a, duel?.b])

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-0.5">
          <CardTitle>
            <LapDuelIcon />
            Race gaps
          </CardTitle>
          <CardDescription>seconds behind the leader at the end of each lap</CardDescription>
        </div>
        <CardAction className="flex items-center gap-1">
          <ToggleGroup
            type="single"
            value={scope}
            onValueChange={(v) => v && setScope(v as Scope)}
            aria-label="Drivers shown"
          >
            <ToggleGroupItem value="top5">Top 5</ToggleGroupItem>
            <ToggleGroupItem value="top10">Top 10</ToggleGroupItem>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
          </ToggleGroup>
          <SaveImageButton name="Race gaps" />
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 sm:px-3">
        <ChartContainer config={config} className="aspect-auto h-[300px] w-full sm:h-[340px]">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            {replay.trackStatus.map((p) => (
              <ReferenceArea
                key={`${p.status}-${p.from}`}
                x1={lapAt(p.from)}
                x2={lapAt(p.to)}
                fill={STATUS_FILL[p.status]}
                fillOpacity={0.08}
                ifOverflow="hidden"
              />
            ))}
            <XAxis
              dataKey="lap"
              type="number"
              domain={[1, replay.totalLaps]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tick={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fill: 'var(--faint-foreground)',
              }}
              tickFormatter={(v: number) => `L${v}`}
            />
            <YAxis
              reversed
              width={38}
              tickLine={false}
              axisLine={false}
              tick={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fill: 'var(--faint-foreground)',
              }}
              tickFormatter={(v: number) => (v === 0 ? '0' : `+${v}`)}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--border-strong)' }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => `Lap ${payload?.[0]?.payload?.lap ?? ''}`}
                  itemSorter={(item) => Number(item.value ?? 0)}
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-1 rounded-full"
                          style={{ backgroundColor: colorOf(String(name)) }}
                        />
                        {String(name)}
                      </span>
                      <span className="numeric text-foreground">
                        {Number(value) === 0 ? 'leader' : `+${Number(value).toFixed(1)}s`}
                      </span>
                    </div>
                  )}
                />
              }
            />
            {drivers.map((d) => (
              <Line
                key={d}
                dataKey={d}
                type="monotone"
                stroke={`var(--color-${d})`}
                strokeWidth={focus.has(d) ? 2.5 : 1.5}
                strokeOpacity={focus.size && !focus.has(d) ? 0.55 : 1}
                dot={false}
                activeDot={{ r: 3.5, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={!reduce}
                animationDuration={700}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
