'use client'

import { findDriver, formatLapTime, raceLaps } from '@unbox-box/tools'
import { useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { SaveImageButton } from '@/components/save-image-button'
import { StopwatchIcon } from '@/components/icons'
import { HelpText } from '@/components/help-text'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useApp } from '@/lib/store'
import { compoundColor, compoundName } from '@/lib/tyres'
import type { RaceData } from '@/lib/types'
import { useDriverColor } from '@/lib/use-team-colors'

const SCOPES = { duel: 0, podium: 3, top5: 5 } as const
type Scope = keyof typeof SCOPES
const TICK = { fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--faint-foreground)' }

interface DotProps {
  cx?: number
  cy?: number
  payload?: Record<string, unknown>
  dataKey?: string
}

/** Every lap for a few drivers: the line in team colour, each dot in its tyre's colour, and
 *  the opening lap, pit laps and slow laps faded so the true pace stands out. */
export function LapTimes({ meta, replay }: RaceData) {
  const [scope, setScope] = useState<Scope>('duel')
  const duel = useApp((s) => s.duel)
  const colorOf = useDriverColor()
  const reduce = useReducedMotion()
  const laps = useMemo(() => raceLaps(meta, replay), [meta, replay])

  const drivers = useMemo(() => {
    const top = meta.results.slice(0, SCOPES[scope]).map((r) => r.driver)
    const pair = [duel?.a, duel?.b].filter((d): d is string => !!d)
    return [...new Set([...pair, ...top])].filter((d) => laps.some((l) => l.driver === d))
  }, [meta, scope, duel, laps])

  const { rows, domain } = useMemo(() => {
    const byLap = new Map<number, Record<string, unknown>>()
    const clean: number[] = []
    for (const l of laps) {
      if (!drivers.includes(l.driver)) continue
      const row = byLap.get(l.lap) ?? { lap: l.lap }
      row[l.driver] = l.time
      row[`${l.driver}:compound`] = l.compound
      row[`${l.driver}:clean`] = l.clean
      byLap.set(l.lap, row)
      if (l.clean) clean.push(l.time)
    }
    clean.sort((a, b) => a - b)
    // Scale to racing laps: in-laps, out-laps and safety-car laps run off the top.
    const lo = clean[0] ?? 60
    const hi = clean[Math.floor(clean.length * 0.97)] ?? lo + 5
    return {
      rows: [...byLap.values()].sort((a, b) => (a.lap as number) - (b.lap as number)),
      domain: [Math.floor(lo - 0.5), Math.ceil(hi + 1)] as [number, number],
    }
  }, [laps, drivers])

  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        drivers.map((d) => [
          d,
          {
            label: findDriver(meta, d)?.lastName ?? d,
            // The duel pair uses the duel colours, kept apart even for teammates.
            color:
              d === duel?.a ? 'var(--driver-a)' : d === duel?.b ? 'var(--driver-b)' : colorOf(d),
          },
        ]),
      ),
    [drivers, meta, colorOf, duel],
  )

  const Dot = ({ cx, cy, payload, dataKey }: DotProps) => {
    if (cx == null || cy == null || !payload || !dataKey) return null
    const compound = payload[`${dataKey}:compound`] as string | undefined
    const clean = payload[`${dataKey}:clean`] as boolean | undefined
    return (
      <circle
        cx={cx}
        cy={cy}
        r={2.75}
        fill={compoundColor(compound)}
        stroke="var(--surface-1)"
        strokeWidth={0.75}
        opacity={clean ? 1 : 0.35}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-0.5">
          <CardTitle>
            <StopwatchIcon />
            Lap times
          </CardTitle>
          <CardDescription>every lap, dots in tyre colours</CardDescription>
        </div>
        <CardAction className="flex items-center gap-1">
          <ToggleGroup
            type="single"
            value={scope}
            onValueChange={(v) => v && setScope(v as Scope)}
            aria-label="Drivers shown"
          >
            <ToggleGroupItem value="duel">Duel</ToggleGroupItem>
            <ToggleGroupItem value="podium">Podium</ToggleGroupItem>
            <ToggleGroupItem value="top5">Top 5</ToggleGroupItem>
          </ToggleGroup>
          <SaveImageButton name="Lap times" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ChartContainer config={config} className="aspect-auto h-[300px] w-full sm:h-[340px]">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis
              dataKey="lap"
              type="number"
              domain={[1, replay.totalLaps]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tick={TICK}
              tickFormatter={(v: number) => `L${v}`}
            />
            <YAxis
              domain={domain}
              allowDataOverflow
              width={52}
              tickLine={false}
              axisLine={false}
              tick={TICK}
              tickFormatter={(v: number) => formatLapTime(v).replace(/\.\d+$/, '')}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--border-strong)' }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => `Lap ${payload?.[0]?.payload?.lap ?? ''}`}
                  itemSorter={(item) => Number(item.value ?? 0)}
                  formatter={(value, name, item) => {
                    const compound = (item.payload as Record<string, unknown>)[
                      `${String(name)}:compound`
                    ] as string | undefined
                    return (
                      <div className="flex w-full items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-2.5 w-1 rounded-full"
                            style={{
                              backgroundColor: config[String(name)]?.color ?? colorOf(String(name)),
                            }}
                          />
                          {String(name)}
                          {compound && (
                            <span className="text-muted-foreground">{compoundName(compound)}</span>
                          )}
                        </span>
                        <span className="numeric text-foreground">
                          {formatLapTime(Number(value))}
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            {drivers.map((d) => (
              <Line
                key={d}
                dataKey={d}
                type="linear"
                stroke={`var(--color-${d})`}
                strokeWidth={1.5}
                strokeOpacity={0.7}
                dot={<Dot />}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls
                isAnimationActive={!reduce}
                animationDuration={700}
              />
            ))}
          </LineChart>
        </ChartContainer>
        <HelpText>
          Faded dots are the opening lap, pit laps and laps over 7% off the driver&apos;s pace
          (safety cars, traffic). The scale fits racing laps, so the slowest run off the top.
        </HelpText>
      </CardContent>
    </Card>
  )
}
