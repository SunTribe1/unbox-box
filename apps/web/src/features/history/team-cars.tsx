'use client'

import { engineLabel, type HistoryData } from '@unbox-box/tools'
import { EngineIcon } from '@/components/icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useApp } from '@/lib/store'
import { useCatalog } from '../archive/use-archive'
import { goTo } from '../shell/nav'

/** Every car the team (and its earlier names) raced: chassis, engine and tyres by season. */
export function TeamCars({ data, team }: { data: HistoryData; team: number }) {
  const catalog = useCatalog()
  if (!catalog.data) return null
  const family = new Set([
    team,
    ...data.index.lineage.filter((l) => l.parent === team).map((l) => l.constructor),
  ])
  const cars = catalog.data.teamSeasons
    .filter((t) => family.has(t.constructor))
    .sort((a, b) => b.year - a.year)
  if (!cars.length) return null
  const openMaker = (kind: 'engine' | 'tyre', i: number | null) => {
    const list = kind === 'engine' ? catalog.data!.engineMakers : catalog.data!.tyreMakers
    const id = i != null ? list[i]?.id : undefined
    if (!id) return
    useApp.getState().setArchive({ kind, maker: id })
    goTo('engines')
  }
  const maker = 'hover:text-signal-ink text-left'
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <EngineIcon /> Cars by season
        </CardTitle>
        <CardDescription>chassis, engine and tyres, newest first</CardDescription>
      </CardHeader>
      <CardContent className="max-h-[420px] overflow-y-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Year</TableHead>
              <TableHead>Car</TableHead>
              <TableHead>Engine</TableHead>
              <TableHead>Tyres</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cars.map((c) => (
              <TableRow key={`${c.year}-${c.constructor}`}>
                <TableCell className="numeric text-muted-foreground">{c.year}</TableCell>
                <TableCell>
                  <span className="grid">
                    <span className="font-medium">{c.chassis.join(', ') || '—'}</span>
                    {c.constructor !== team && (
                      <span className="text-caption text-muted-foreground">
                        as {data.index.constructors[c.constructor]?.name}
                      </span>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    className={maker}
                    onClick={() => openMaker('engine', c.engineMaker)}
                  >
                    <span className="grid">
                      <span>{catalog.data!.engineMakers[c.engineMaker ?? -1]?.name ?? '—'}</span>
                      <span className="text-caption text-muted-foreground">
                        {c.engines.map(engineLabel).join(', ')}
                      </span>
                    </span>
                  </button>
                </TableCell>
                <TableCell>
                  {c.tyres.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`${maker} mr-2`}
                      onClick={() => openMaker('tyre', t)}
                    >
                      {catalog.data!.tyreMakers[t]?.name}
                    </button>
                  ))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
