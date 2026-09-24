'use client'

import { nationProfile, type Catalog, type HistoryData } from '@unbox-box/tools'
import { useQuery } from '@tanstack/react-query'
import { m } from 'motion/react'
import { useMemo } from 'react'
import { BackButton } from '@/components/back-button'
import { Flag } from '@/components/flag'
import { CircuitIcon, DriverIcon, StrategyIcon, TrophyIcon } from '@/components/icons'
import { StatTile } from '@/components/stat-tile'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { circuitShapesQuery } from '@/lib/data'
import { enter } from '@/lib/motion'
import { useApp } from '@/lib/store'
import { DriverLink, openCircuit, TeamLink } from '../archive/links'
import { CircuitOutline } from '../circuits/circuit-outline'

const CONTINENT: Record<string, string> = {
  europe: 'Europe',
  'north-america': 'North America',
  'south-america': 'South America',
  asia: 'Asia',
  oceania: 'Oceania',
  africa: 'Africa',
  antarctica: 'Antarctica',
}

/** One country: its drivers, champions, teams and circuits. */
export function NationPage({
  data,
  catalog,
  code,
}: {
  data: HistoryData
  catalog: Catalog
  code: string
}) {
  const setArchive = useApp((s) => s.setArchive)
  const shapes = useQuery(circuitShapesQuery())
  const p = useMemo(() => nationProfile(data, catalog, code), [data, catalog, code])
  const back = (
    <BackButton onClick={() => setArchive({ nation: undefined })}>All nations</BackButton>
  )
  if (!p) {
    return (
      <div className="grid gap-3">
        <div>{back}</div>
        <p className="text-sm text-muted-foreground">No F1 history for this country code.</p>
      </div>
    )
  }
  const { summary: n } = p
  const hosted = (i: number) => data.index.races.circuit.filter((c) => c === i).length
  const driver = (i: number) => data.index.drivers[i]!

  return (
    <m.div className="grid gap-4" {...enter}>
      <div>{back}</div>
      <Card>
        <CardContent className="grid gap-4 pt-4 sm:pt-5">
          <div className="flex items-center gap-4">
            <Flag code={n.code} className="h-10 w-[54px] rounded-[4px]" />
            <div className="grid gap-0.5">
              <h2 className="text-display">{n.name}</h2>
              <span className="text-sm text-muted-foreground">
                {CONTINENT[n.continent ?? ''] ?? ''}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 @min-[560px]:grid-cols-3 @min-[1000px]:grid-cols-6">
            <StatTile label="Drivers" value={n.drivers} />
            <StatTile label="Race winners" value={n.winners} />
            <StatTile label="Wins" value={n.wins} />
            <StatTile label="Drivers’ titles" value={n.titles} />
            <StatTile label="Teams" value={n.teams} />
            <StatTile
              label="Grands Prix hosted"
              value={n.races}
              detail={n.circuits ? `at ${n.circuits} circuits` : undefined}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 @min-[1100px]:grid-cols-3">
        <Card className="@min-[1100px]:col-span-2">
          <CardHeader>
            <CardTitle>
              <DriverIcon /> Drivers
            </CardTitle>
            <CardDescription>champions first, then by wins</CardDescription>
          </CardHeader>
          <CardContent>
            {p.drivers.length ? (
              <ul className="grid gap-x-6 gap-y-1.5 @min-[700px]:grid-cols-2">
                {p.drivers.slice(0, 60).map((d) => {
                  const x = driver(d)
                  return (
                    <li key={d} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        <DriverLink data={data} driver={d} />
                        {x.titles > 0 && (
                          <Badge className="border-transparent bg-signal-soft text-signal-ink">
                            {x.titles}× champion
                          </Badge>
                        )}
                      </span>
                      <span className="shrink-0 numeric text-caption text-muted-foreground">
                        {x.wins ? `${x.wins} W · ` : ''}
                        {x.starts} starts ·{' '}
                        {x.firstYear === x.lastYear ? x.firstYear : `${x.firstYear}–${x.lastYear}`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No drivers have raced for {n.name} yet.
              </p>
            )}
            {p.drivers.length > 60 && (
              <p className="mt-3 text-caption text-muted-foreground">
                And {p.drivers.length - 60} more.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          {p.champions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <TrophyIcon /> Champions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1.5">
                {p.champions.map((c) => (
                  <div key={c.year} className="flex items-center gap-3 text-sm">
                    <span className="w-10 numeric text-muted-foreground">{c.year}</span>
                    <DriverLink data={data} driver={c.driver} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {p.teams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <StrategyIcon /> Teams
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1.5">
                {p.teams.slice(0, 20).map((t) => (
                  <div key={t} className="flex items-center justify-between gap-2 text-sm">
                    <TeamLink data={data} team={t} />
                    <span className="numeric text-caption text-muted-foreground">
                      {data.index.constructors[t]?.wins ?? 0} W
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {p.circuits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <CircuitIcon /> Circuits
            </CardTitle>
            <CardDescription>every venue in {n.name} that hosted a Grand Prix</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-4">
              {p.circuits
                .filter((c) => hosted(c) > 0)
                .map((c) => {
                  const circuit = data.index.circuits[c]!
                  const shape = shapes.data?.[circuit.id]
                  return (
                    <li key={c}>
                      <button
                        type="button"
                        onClick={() => openCircuit(data, c)}
                        className="group grid w-full gap-2 rounded-lg bg-surface-2/60 p-3 text-left transition-colors hover:bg-surface-2"
                      >
                        <div className="flex h-20 items-center justify-center">
                          {shape ? (
                            <CircuitOutline
                              shape={shape}
                              className="h-full w-full transition-colors group-hover:text-signal"
                              label={`${circuit.name} layout`}
                            />
                          ) : (
                            <CircuitIcon className="size-7 text-faint-foreground" aria-hidden />
                          )}
                        </div>
                        <span className="grid">
                          <span className="truncate text-sm font-medium">{circuit.name}</span>
                          <span className="numeric text-caption text-muted-foreground">
                            {circuit.place} · {hosted(c)} GP{hosted(c) > 1 ? 's' : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
            </ul>
          </CardContent>
        </Card>
      )}
    </m.div>
  )
}
