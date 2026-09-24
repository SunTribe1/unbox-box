'use client'

import {
  formatMillis,
  resultTime,
  type HistoryData,
  type SessionRow,
  type WeekendSession,
} from '@unbox-box/tools'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import type * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { GrowBar } from '@/components/ui/grow-bar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { DriverLink, TeamLink } from '../archive/links'

interface Column {
  head: string
  align?: 'right'
  className?: string
  cell: (row: SessionRow, i: number, rows: SessionRow[]) => React.ReactNode
}

const time = (ms?: number) => (ms != null ? formatMillis(ms) : '')
const pos = (r: SessionRow) => r.pos ?? r.text ?? ''

function Gained({ value }: { value?: number }) {
  if (!value) return null
  const up = value > 0
  const Icon = up ? ArrowUpIcon : ArrowDownIcon
  return (
    <span
      className={cn(
        'inline-flex items-center text-caption',
        up ? 'text-success' : 'text-muted-foreground',
      )}
      aria-label={`${up ? 'gained' : 'lost'} ${Math.abs(value)}`}
    >
      <Icon className="size-3" aria-hidden />
      {Math.abs(value)}
    </span>
  )
}

function Marks({ row }: { row: SessionRow }) {
  return (
    <span className="flex gap-1">
      {row.fastestLap && (
        <Badge className="border-transparent bg-sector-best/15 text-sector-best">FL</Badge>
      )}
      {row.dotd && <Badge variant="outline">DOTD</Badge>}
      {row.grandSlam && (
        <Badge className="border-transparent bg-signal-soft text-signal-ink">Grand slam</Badge>
      )}
      {row.shared && <Badge variant="outline">Shared car</Badge>}
    </span>
  )
}

/** Columns per kind of session: results, qualifying, grids, timed sessions, stops, votes. */
function columns(data: HistoryData, session: WeekendSession, rows: SessionRow[]): Column[] {
  const driver: Column = {
    head: 'Driver',
    className: 'min-w-40',
    cell: (r) => <DriverLink data={data} driver={r.driver} />,
  }
  const team: Column = {
    head: 'Team',
    className: 'min-w-32',
    cell: (r) => <TeamLink data={data} team={r.team} className="text-muted-foreground" />,
  }
  const position: Column = { head: 'Pos', className: 'w-12 text-muted-foreground', cell: pos }
  const number: Column = {
    head: 'No.',
    className: 'w-12 text-muted-foreground',
    cell: (r) => r.number ?? '',
  }
  const laps: Column = { head: 'Laps', align: 'right', cell: (r) => r.laps ?? '' }

  if (session === 'race' || session === 'sprint') {
    return [
      position,
      number,
      driver,
      team,
      laps,
      {
        head: 'Time / retired',
        align: 'right',
        className: 'min-w-28',
        cell: (r, i, rows) => (
          <span className={cn(r.retired && 'text-muted-foreground')}>
            {resultTime(r, r.pos === 1 || (i === 0 && rows[0]?.pos === 1))}
            {r.timePenalty ? (
              <span className="ml-1 text-caption text-muted-foreground">
                (+{time(r.timePenalty)} pen.)
              </span>
            ) : null}
          </span>
        ),
      },
      {
        head: 'Grid',
        align: 'right',
        cell: (r) => (
          <span className="inline-flex items-center gap-1.5">
            <Gained value={r.gained} />
            {r.gridText ?? r.grid ?? ''}
          </span>
        ),
      },
      { head: 'Stops', align: 'right', cell: (r) => r.stops ?? '' },
      {
        head: 'Pts',
        align: 'right',
        className: 'font-medium',
        cell: (r) => (r.points ? r.points : ''),
      },
      { head: '', cell: (r) => <Marks row={r} /> },
    ]
  }
  if (session === 'qualifying' || session === 'sprintQualifying') {
    // Knockout qualifying has Q1–Q3; older formats one time per driver.
    const parts = (['q1', 'q2', 'q3'] as const).filter((q) => rows.some((r) => r[q] != null))
    return [
      position,
      driver,
      team,
      ...(parts.length
        ? parts.map((q) => ({
            head: q.toUpperCase(),
            align: 'right' as const,
            cell: (r: SessionRow) => time(r[q]),
          }))
        : [{ head: 'Time', align: 'right' as const, cell: (r: SessionRow) => time(r.time) }]),
      {
        head: 'Gap',
        align: 'right',
        className: 'text-muted-foreground',
        cell: (r) => (r.gap ? `+${time(r.gap)}` : ''),
      },
      laps,
    ]
  }
  if (session === 'grid' || session === 'sprintGrid') {
    return [
      position,
      driver,
      team,
      { head: 'Qualified', align: 'right', cell: (r) => r.qualified ?? '' },
      {
        head: 'Penalty',
        cell: (r) => (r.penalty ? <Badge variant="outline">{r.penalty}</Badge> : ''),
      },
      { head: 'Time', align: 'right', cell: (r) => time(r.time) },
    ]
  }
  if (session === 'pitStops') {
    return [
      { head: 'Lap', className: 'w-12 text-muted-foreground', cell: (r) => r.lap ?? '' },
      driver,
      team,
      { head: 'Stop', align: 'right', cell: (r) => r.stop ?? '' },
      {
        head: 'Pit lane',
        align: 'right',
        className: 'min-w-40',
        cell: (r, _i, rows) => {
          const times = rows.flatMap((x) => (x.time != null ? [x.time] : []))
          const min = Math.min(...times)
          const max = Math.max(...times)
          const share = r.time != null && max > min ? 1 - (r.time - min) / (max - min) : 1
          return (
            <span className="grid grid-cols-[1fr_4.5rem] items-center gap-2">
              <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <GrowBar value={0.15 + 0.85 * share} className="rounded-full bg-signal/70" />
              </span>
              {time(r.time)}
            </span>
          )
        },
      },
    ]
  }
  if (session === 'driverOfTheDay') {
    return [
      position,
      driver,
      team,
      {
        head: 'Vote share',
        align: 'right',
        className: 'min-w-40',
        cell: (r, _i, rows) =>
          r.percentage != null ? (
            <span className="grid grid-cols-[1fr_3.5rem] items-center gap-2">
              <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <GrowBar
                  value={r.percentage / (rows[0]?.percentage || 100)}
                  className="rounded-full bg-signal/70"
                />
              </span>
              {r.percentage}%
            </span>
          ) : (
            ''
          ),
      },
    ]
  }
  // Practice, warm-up, pre-qualifying, the old two-part qualifying, fastest laps.
  return [
    position,
    driver,
    team,
    ...(session === 'fastestLaps'
      ? [{ head: 'Lap', align: 'right' as const, cell: (r: SessionRow) => r.lap ?? '' }]
      : []),
    { head: 'Time', align: 'right', cell: (r) => time(r.time) },
    {
      head: 'Gap',
      align: 'right',
      className: 'text-muted-foreground',
      cell: (r) => (r.gap ? `+${time(r.gap)}` : ''),
    },
    ...(session === 'fastestLaps' ? [] : [laps]),
  ]
}

/** Any session of a weekend as a table; columns suit the session. */
export function SessionTable({
  data,
  session,
  rows,
}: {
  data: HistoryData
  session: WeekendSession
  rows: SessionRow[]
}) {
  const cols = columns(data, session, rows)
  return (
    <Table className="numeric">
      <TableHeader>
        <TableRow>
          {cols.map((c, i) => (
            <TableHead key={i} className={cn(c.align === 'right' && 'text-right')}>
              {c.head}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={`${r.driver}-${r.stop ?? i}-${i}`}>
            {cols.map((c, j) => (
              <TableCell key={j} className={cn(c.align === 'right' && 'text-right', c.className)}>
                {c.cell(r, i, rows)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
