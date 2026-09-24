'use client'

/** The Race Archive season tabs: calendar, entry list and the driver and team tables. */

import {
  weekendHeadline,
  type HistoryData,
  type SeasonArchive,
  type SeasonStats,
} from '@unbox-box/tools'
import { m } from 'motion/react'
import { useMemo } from 'react'
import { Flag } from '@/components/flag'
import { TileButton } from '@/components/tile-button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatEventDate } from '@/lib/format'
import { riseIn, stagger } from '@/lib/motion'
import { DriverLink, openRace, TeamLink } from '../archive/links'
import { useCatalog } from '../archive/use-archive'

export function Calendar({ data, season }: { data: HistoryData; season: SeasonArchive }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <m.ul
      key={season.year}
      className="grid gap-3 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-3 @min-[1300px]:grid-cols-4"
      variants={stagger(0.025)}
      initial="hidden"
      animate="show"
    >
      {season.races.map((w) => {
        const head = weekendHeadline(w)
        const circuit = w.circuit != null ? data.index.circuits[w.circuit] : undefined
        const done = !!w.sessions.race?.length
        const driver = (i?: number) => (i != null ? data.index.drivers[i] : undefined)
        const winner = driver(head.winner?.driver)
        const pole = driver(head.pole?.driver)
        return (
          <m.li key={w.round} variants={riseIn}>
            <TileButton onClick={() => openRace(season.year, w.round)} className="gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="numeric text-label text-muted-foreground">Round {w.round}</span>
                <span className="flex gap-1">
                  {w.sessions.sprint?.length ? <Badge variant="outline">Sprint</Badge> : null}
                  {w.driversDecider && (
                    <Badge className="border-transparent bg-signal-soft text-signal-ink">
                      Title decided
                    </Badge>
                  )}
                  {!done && w.date >= today && <Badge variant="outline">Upcoming</Badge>}
                </span>
              </div>
              <div className="grid gap-0.5">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Flag code={circuit?.code} />
                  <span className="truncate">{w.fullName ?? `${w.name} Grand Prix`}</span>
                </span>
                <span className="truncate text-caption text-muted-foreground">
                  {formatEventDate(w.date)} · {circuit?.name ?? 'TBC'}
                </span>
              </div>
              {done ? (
                <dl className="grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-1 text-caption">
                  <dt className="text-muted-foreground">Winner</dt>
                  <dd className="flex min-w-0 items-center gap-1.5">
                    <Flag code={winner?.code} />
                    <span className="truncate font-medium">{winner?.name ?? '—'}</span>
                  </dd>
                  <dt className="text-muted-foreground">Pole</dt>
                  <dd className="flex min-w-0 items-center gap-1.5">
                    <Flag code={pole?.code} />
                    <span className="truncate">{pole?.name ?? '—'}</span>
                  </dd>
                </dl>
              ) : (
                <span className="text-caption text-muted-foreground">
                  {w.date >= today ? 'Not raced yet' : 'No result recorded'}
                </span>
              )}
            </TileButton>
          </m.li>
        )
      })}
    </m.ul>
  )
}

export function EntryList({ data, season }: { data: HistoryData; season: SeasonArchive }) {
  const catalog = useCatalog()
  const groups = useMemo(() => {
    const byTeam = new Map<string, SeasonArchive['entries']>()
    for (const e of season.entries) {
      const key = `${e.constructor}:${e.entrant}`
      byTeam.set(key, [...(byTeam.get(key) ?? []), e])
    }
    return [...byTeam.values()]
  }, [season])
  const car = (team: number | null) =>
    catalog.data?.teamSeasons.find((t) => t.year === season.year && t.constructor === team)
  const maker = (i: number | null) => (i != null ? catalog.data?.engineMakers[i]?.name : undefined)

  return (
    <Card className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Team</TableHead>
            <TableHead>Car</TableHead>
            <TableHead>Engine</TableHead>
            <TableHead>Drivers</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((entries) => {
            const first = entries[0]!
            const c = car(first.constructor)
            return (
              <TableRow key={`${first.constructor}:${first.entrant}`} className="align-top">
                <TableCell className="min-w-44">
                  <div className="grid gap-0.5">
                    <TeamLink
                      data={data}
                      team={first.constructor ?? undefined}
                      className="font-medium"
                    />
                    <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
                      <Flag code={first.country} />
                      {first.entrant}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-caption">{c?.chassis.join(', ') || '—'}</TableCell>
                <TableCell className="text-caption">
                  {c?.engines.map((e) => e.name).join(', ') || maker(first.engine) || '—'}
                </TableCell>
                <TableCell>
                  <ul className="grid gap-1">
                    {entries.map((e) => (
                      <li key={e.driver} className="flex flex-wrap items-center gap-x-2">
                        <DriverLink data={data} driver={e.driver} />
                        {e.test && <Badge variant="outline">Test</Badge>}
                        {e.rounds && (
                          <span className="numeric text-caption text-faint-foreground">
                            R{e.rounds}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}

export function StatsTable({
  data,
  rows,
  kind,
}: {
  data: HistoryData
  rows: SeasonStats[]
  kind: 'driver' | 'team'
}) {
  const sorted = [...rows].sort((a, b) => (a.pos ?? 999) - (b.pos ?? 999) || b.points - a.points)
  return (
    <Card className="p-0">
      <Table className="numeric">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">Pos</TableHead>
            <TableHead>{kind === 'driver' ? 'Driver' : 'Team'}</TableHead>
            <TableHead className="text-right">Pts</TableHead>
            <TableHead className="text-right">Wins</TableHead>
            <TableHead className="text-right">Podiums</TableHead>
            <TableHead className="text-right">Poles</TableHead>
            <TableHead className="text-right">Fastest laps</TableHead>
            <TableHead className="text-right">Starts</TableHead>
            <TableHead className="text-right">{kind === 'driver' ? 'Best grid' : '1–2s'}</TableHead>
            {kind === 'driver' && <TableHead className="text-right">DOTD</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => (
            <TableRow key={kind === 'driver' ? r.driver : r.team}>
              <TableCell className="text-muted-foreground">{r.pos ?? '—'}</TableCell>
              <TableCell className="min-w-40 font-sans">
                {kind === 'driver' ? (
                  <DriverLink data={data} driver={r.driver} />
                ) : (
                  <TeamLink data={data} team={r.team} />
                )}
              </TableCell>
              <TableCell className="text-right font-medium">{r.points}</TableCell>
              <TableCell className="text-right">{r.wins || ''}</TableCell>
              <TableCell className="text-right">{r.podiums || ''}</TableCell>
              <TableCell className="text-right">{r.poles || ''}</TableCell>
              <TableCell className="text-right">{r.fastestLaps || ''}</TableCell>
              <TableCell className="text-right">{r.starts}</TableCell>
              <TableCell className="text-right">
                {kind === 'driver' ? (r.bestGrid ?? '') : r.oneTwos || ''}
              </TableCell>
              {kind === 'driver' && <TableCell className="text-right">{r.dotd || ''}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
