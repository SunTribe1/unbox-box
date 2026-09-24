'use client'

import { formatMillis, type HistoryData, type Records } from '@unbox-box/tools'
import { m } from 'motion/react'
import { useState } from 'react'
import { HelpText } from '@/components/help-text'
import { ChequeredFlagIcon, PitBoardIcon, PodiumIcon, StopwatchIcon } from '@/components/icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { GrowBar } from '@/components/ui/grow-bar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { riseIn, stagger } from '@/lib/motion'
import { DriverLink, openRace, TeamLink } from '../archive/links'
import { useRecords } from '../archive/use-archive'

type Row = Records['closestFinishes'][number] | Records['winsFromFurthestBack'][number]

function raceName(data: HistoryData, year: number, round: number) {
  const { races } = data.index
  const i = races.year.findIndex((y, k) => y === year && races.round[k] === round)
  return i >= 0 ? `${year} ${races.name[i]}` : String(year)
}

function MomentList({
  data,
  rows,
  value,
  limit = 10,
}: {
  data: HistoryData
  rows: Row[]
  value: (r: Row) => string
  limit?: number
}) {
  return (
    <m.ol className="grid gap-2" variants={stagger(0.03)} initial="hidden" animate="show">
      {rows.slice(0, limit).map((r) => (
        <m.li
          key={`${r.year}-${r.round}-${r.driver}`}
          variants={riseIn}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 text-sm"
        >
          <span className="grid min-w-0">
            <span className="flex min-w-0 items-center gap-1.5">
              <DriverLink data={data} driver={r.driver} />
              {'runnerUp' in r && (
                <>
                  <span className="text-caption text-faint-foreground">over</span>
                  <DriverLink
                    data={data}
                    driver={r.runnerUp}
                    short
                    className="text-muted-foreground"
                  />
                </>
              )}
            </span>
            <button
              type="button"
              className="w-fit truncate text-caption text-muted-foreground hover:text-signal-ink"
              onClick={() => openRace(r.year, r.round)}
            >
              {raceName(data, r.year, r.round)}
            </button>
          </span>
          <span className="numeric font-medium">{value(r)}</span>
        </m.li>
      ))}
    </m.ol>
  )
}

/** One-off race records from F1DB's full session tables. */
export function Moments({ data }: { data: HistoryData }) {
  const records = useRecords()
  const years = [...new Set(records.data?.pitCrews.map((p) => p.year) ?? [])].sort((a, b) => b - a)
  const [year, setYear] = useState<number>()
  if (records.error) return <ErrorState title="Moments unavailable" error={records.error} />
  if (!records.data) return <Skeleton className="h-[480px] rounded-xl" />
  const r = records.data
  const crewYear = year ?? years[0]
  const crews = r.pitCrews.filter((p) => p.year === crewYear).sort((a, b) => a.value - b.value)
  const worst = Math.max(...crews.map((c) => c.value), 1)
  const bestCrew = Math.min(...crews.map((c) => c.value))

  return (
    <div className="grid items-start gap-4 @min-[900px]:grid-cols-2 @min-[1400px]:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>
            <StopwatchIcon /> Closest finishes
          </CardTitle>
          <CardDescription>winner to second place, on the same lap</CardDescription>
        </CardHeader>
        <CardContent>
          <MomentList
            data={data}
            rows={r.closestFinishes}
            value={(x) => `+${formatMillis(x.value)}`}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <ChequeredFlagIcon /> Biggest winning margins
          </CardTitle>
          <CardDescription>same lap as second place</CardDescription>
        </CardHeader>
        <CardContent>
          <MomentList data={data} rows={r.biggestWins} value={(x) => `+${formatMillis(x.value)}`} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <PodiumIcon /> Wins from furthest back
          </CardTitle>
          <CardDescription>starting grid position of the winner</CardDescription>
        </CardHeader>
        <CardContent>
          <MomentList data={data} rows={r.winsFromFurthestBack} value={(x) => `P${x.value}`} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <PodiumIcon /> Driver of the Day landslides
          </CardTitle>
          <CardDescription>biggest share of the fan vote (since 2016)</CardDescription>
        </CardHeader>
        <CardContent>
          <MomentList data={data} rows={r.driverOfTheDayShare} value={(x) => `${x.value}%`} />
        </CardContent>
      </Card>
      <Card className="@min-[1400px]:col-span-2">
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="grid gap-1">
            <CardTitle>
              <PitBoardIcon /> Pit crews
            </CardTitle>
            <CardDescription>median pit-lane time against each race’s median</CardDescription>
          </div>
          <Select value={String(crewYear)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24" aria-label="Pit crew season">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="grid gap-2">
          {crews.map((c) => (
            <div
              key={c.constructor}
              className="grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] items-center gap-3 text-sm"
            >
              <TeamLink data={data} team={c.constructor} />
              <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <GrowBar
                  value={
                    worst > bestCrew ? 0.15 + (0.85 * (worst - c.value)) / (worst - bestCrew) : 1
                  }
                  className="rounded-full bg-signal/70"
                />
              </span>
              <span className="text-right numeric">
                {c.value > 0 ? '+' : c.value < 0 ? '−' : ''}
                {(Math.abs(c.value) / 1000).toFixed(2)} s
              </span>
            </div>
          ))}
          <HelpText>
            F1DB records the whole trip down the pit lane. Comparing each stop with that race’s
            median cancels out pit-lane length; drive-throughs and long repairs are left out.
          </HelpText>
        </CardContent>
      </Card>
    </div>
  )
}
