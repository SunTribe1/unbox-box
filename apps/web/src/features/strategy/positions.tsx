'use client'

import { positionHistory } from '@unbox-box/tools'
import { useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { SaveImageButton } from '@/components/save-image-button'
import { HelpText } from '@/components/help-text'
import { StartLightsIcon } from '@/components/icons'
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
import { useApp, usePlayback } from '@/lib/store'
import type { RaceData } from '@/lib/types'
import { useDriverColor } from '@/lib/use-team-colors'

const TICK = { fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--faint-foreground)' }

/** The running order at the end of every lap, from the grid to the flag. The two Lap Duel
 *  drivers and the followed car are drawn bold; everyone else stays in the background. */
export function Positions({ meta, replay }: RaceData) {
  const duel = useApp((s) => s.duel)
  const focus = usePlayback((s) => s.focus)
  const colorOf = useDriverColor()
  const reduce = useReducedMotion()
  const history = useMemo(() => positionHistory(replay), [replay])
  const drivers = useMemo(
    () => meta.results.map((r) => r.driver).filter((d) => history.rows[d]),
    [meta, history],
  )
  const rows = useMemo(
    () =>
      history.laps.map((lap) => ({
        lap,
        ...Object.fromEntries(drivers.map((d) => [d, history.rows[d]![lap]])),
      })),
    [history, drivers],
  )
  const config = useMemo<ChartConfig>(
    () => Object.fromEntries(drivers.map((d) => [d, { label: d, color: colorOf(d) }])),
    [drivers, colorOf],
  )
  const bold = new Set([duel?.a, duel?.b, focus].filter(Boolean))
  const field = drivers.length

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-0.5">
          <CardTitle>
            <StartLightsIcon />
            Positions
          </CardTitle>
          <CardDescription>running order at the end of every lap</CardDescription>
        </div>
        <CardAction>
          <SaveImageButton name="Positions" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ChartContainer config={config} className="aspect-auto h-[300px] w-full sm:h-[340px]">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="lap"
              type="number"
              domain={[0, replay.totalLaps]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tick={TICK}
              tickFormatter={(v: number) => (v === 0 ? 'Grid' : `L${v}`)}
            />
            <YAxis
              reversed
              domain={[1, field]}
              ticks={[1, 5, 10, 15, 20].filter((t) => t <= field)}
              width={28}
              tickLine={false}
              axisLine={false}
              tick={TICK}
              tickFormatter={(v: number) => `P${v}`}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--border-strong)' }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const lap = payload?.[0]?.payload?.lap as number | undefined
                    return lap ? `End of lap ${lap}` : 'Grid'
                  }}
                  itemSorter={(item) => Number(item.value ?? 99)}
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-1 rounded-full"
                          style={{ backgroundColor: colorOf(String(name)) }}
                        />
                        {String(name)}
                      </span>
                      <span className="numeric text-foreground">P{String(value)}</span>
                    </div>
                  )}
                />
              }
            />
            {drivers.map((d) => (
              <Line
                key={d}
                dataKey={d}
                type="linear"
                stroke={`var(--color-${d})`}
                strokeWidth={bold.has(d) ? 2.5 : 1.25}
                strokeOpacity={bold.size && !bold.has(d) ? 0.45 : 0.9}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={!reduce}
                animationDuration={700}
              />
            ))}
          </LineChart>
        </ChartContainer>
        <HelpText>
          Bold lines are your Lap Duel drivers and the car you follow. A line that ends early is a
          retirement.
        </HelpText>
      </CardContent>
    </Card>
  )
}
