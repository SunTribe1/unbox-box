'use client'

import { circuitWinners, historicDriver, ranking, type HistoryData } from '@unbox-box/tools'
import { useMemo } from 'react'
import { TrophyIcon } from '@/components/icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function CircuitCard({ data, circuitId }: { data: HistoryData; circuitId: string }) {
  const idx = data.index.circuits.findIndex((c) => c.id === circuitId)
  const winners = useMemo(() => (idx >= 0 ? circuitWinners(data, idx) : []), [data, idx])
  const kings = useMemo(
    () => (idx >= 0 ? ranking(data, 'wins', { circuit: idx }, 3) : []),
    [data, idx],
  )
  if (idx < 0) return null
  const c = data.index.circuits[idx]!
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <TrophyIcon />
          {c.name} winners
        </CardTitle>
        <CardDescription>{winners.length} Grands Prix</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-3 gap-2">
          {kings.map((k, i) => {
            const d = historicDriver(data, k.driver)
            return (
              <div key={d.id} className="rounded-lg bg-surface-2 p-3">
                <div className="numeric text-2xl font-semibold">{k.value}</div>
                <div className="truncate text-sm">{d.lastName}</div>
                <div className="text-[11px] text-muted-foreground">
                  {i === 0 ? 'most wins' : `${i + 1}${i === 1 ? 'nd' : 'rd'}`}
                </div>
              </div>
            )
          })}
        </div>
        <ol className="grid gap-1 text-sm" aria-label={`Recent winners at ${c.name}`}>
          {winners.slice(0, 10).map((w) => (
            <li key={`${w.year}-${w.race}`} className="flex items-baseline gap-3">
              <span className="w-10 numeric text-xs text-muted-foreground">{w.year}</span>
              <span className="truncate">{historicDriver(data, w.driver).name}</span>
              <span className="ml-auto truncate text-xs text-muted-foreground">
                {w.constructor}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
