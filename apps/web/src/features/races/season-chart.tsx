'use client'

import type { Progression } from '@unbox-box/tools'
import { useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

const TICK = { fontFamily: 'var(--font-mono)', fontSize: 10, fill: 'var(--faint-foreground)' }

/** Cumulative points after every round, one line per contender (the top `limit`). */
export function SeasonChart({
  progression,
  colorOf,
  limit = 8,
}: {
  progression: Progression
  colorOf: (id: number, rank: number) => string
  limit?: number
}) {
  const reduce = useReducedMotion()
  const rows = progression.rows.slice(0, limit)
  const keyOf = (id: number) => `c${id}`
  const data = useMemo(
    () =>
      progression.rounds.map((r, i) => ({
        round: r.round,
        name: r.name,
        ...Object.fromEntries(rows.map((row) => [keyOf(row.id), row.points[i]])),
      })),
    [progression, rows],
  )
  const config = Object.fromEntries(
    rows.map((row, i) => [keyOf(row.id), { label: row.name, color: colorOf(row.id, i) }]),
  ) satisfies ChartConfig

  return (
    <ChartContainer config={config} className="aspect-auto h-[300px] w-full sm:h-[340px]">
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="round"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
          tick={TICK}
          tickFormatter={(v: number) => `R${v}`}
        />
        <YAxis width={40} tickLine={false} axisLine={false} tick={TICK} />
        <ChartTooltip
          cursor={{ stroke: 'var(--border-strong)' }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as { round?: number; name?: string } | undefined
                return p ? `Round ${p.round} · ${p.name}` : ''
              }}
              itemSorter={(item) => -Number(item.value ?? 0)}
            />
          }
        />
        {rows.map((row, i) => (
          <Line
            key={row.id}
            dataKey={keyOf(row.id)}
            type="monotone"
            stroke={`var(--color-${keyOf(row.id)})`}
            strokeWidth={i < 2 ? 2.5 : 1.5}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
            connectNulls
            isAnimationActive={!reduce}
            animationDuration={700}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
