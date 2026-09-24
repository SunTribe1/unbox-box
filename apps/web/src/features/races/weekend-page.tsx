'use client'

import {
  formatMillis,
  SESSION_LABELS,
  weekendHeadline,
  weekendSessions,
  type HistoryData,
  type SeasonArchive,
  type Weekend,
  type WeekendSession,
} from '@unbox-box/tools'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { m } from 'motion/react'
import { BackButton } from '@/components/back-button'
import { Flag } from '@/components/flag'
import { HelpText } from '@/components/help-text'
import { ChequeredFlagIcon, CircuitIcon, StartLightsIcon } from '@/components/icons'
import { StatTile } from '@/components/stat-tile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, ScrollTabsList, TabsTrigger } from '@/components/ui/tabs'
import { indexQuery } from '@/lib/data'
import { formatEventDate } from '@/lib/format'
import { enter } from '@/lib/motion'
import { useApp } from '@/lib/store'
import { DriverLink, openCircuit } from '../archive/links'
import { goTo } from '../shell/nav'
import { SessionTable } from './session-table'

const QUALIFYING: Record<string, string> = {
  KNOCKOUT: 'Knockout (Q1, Q2, Q3)',
  ONE_SESSION: 'One session',
  TWO_SESSION: 'Two sessions',
  FOUR_LAPS: 'Four timed laps',
  AGGREGATE: 'Aggregate of two sessions',
  FIRST_SESSION_ONLY: 'First session only',
  ONE_LAP: 'One lap',
}

/** One Grand Prix weekend: headline figures, then a tab per session F1DB has. */
export function WeekendPage({
  data,
  season,
  weekend: w,
}: {
  data: HistoryData
  season: SeasonArchive
  weekend: Weekend
}) {
  const archive = useApp((s) => s.archive)
  const setArchive = useApp((s) => s.setArchive)
  const setSession = useApp((s) => s.setSession)
  const index = useQuery(indexQuery())
  const sessions = weekendSessions(w)
  const tab = (
    sessions.includes(archive.session as WeekendSession) ? archive.session : sessions[0]
  ) as WeekendSession | undefined
  const head = weekendHeadline(w)
  const circuit = w.circuit != null ? data.index.circuits[w.circuit] : undefined
  const rounds = season.races.map((r) => r.round)
  const at = rounds.indexOf(w.round)
  const step = (d: number) => setArchive({ round: rounds[at + d], session: archive.session })
  // Sessions with full telemetry in our data, for a jump into Lap Duel or Replay.
  const ours = (index.data?.sessions ?? []).filter(
    (s) => s.season === season.year && circuit && s.circuitId === circuit.id,
  )
  const open = (id: string, view: 'lap-duel' | 'replay') => {
    setSession(id)
    goTo(view)
  }

  return (
    <m.div className="grid gap-4" {...enter}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackButton onClick={() => setArchive({ round: undefined, session: undefined })}>
          {season.year} season
        </BackButton>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" disabled={at <= 0} onClick={() => step(-1)}>
            <ChevronLeftIcon /> Round {rounds[at - 1] ?? ''}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={at >= rounds.length - 1}
            onClick={() => step(1)}
          >
            Round {rounds[at + 1] ?? ''} <ChevronRightIcon />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-4 sm:pt-5">
          <div className="grid gap-1">
            <span className="numeric text-label text-muted-foreground">
              {season.year} · Round {w.round}
            </span>
            <h2 className="flex items-center gap-2.5 text-display">
              <Flag
                code={circuit?.code}

                className="h-4 w-[22px]"
              />
              {w.fullName ?? `${w.name} Grand Prix`}
            </h2>
            <p className="text-sm text-muted-foreground">{w.officialName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{formatEventDate(w.date)}</Badge>
              {w.qualifyingFormat && QUALIFYING[w.qualifyingFormat] && (
                <Badge variant="outline">Qualifying: {QUALIFYING[w.qualifyingFormat]}</Badge>
              )}
              {circuit && (
                <Button variant="outline" size="xs" onClick={() => openCircuit(data, w.circuit!)}>
                  <CircuitIcon /> {circuit.name}
                </Button>
              )}
              {w.driversDecider && (
                <Badge className="border-transparent bg-signal-soft text-signal-ink">
                  Drivers’ title decided here
                </Badge>
              )}
              {w.constructorsDecider && (
                <Badge className="border-transparent bg-signal-soft text-signal-ink">
                  Constructors’ title decided here
                </Badge>
              )}
              {ours.map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  size="xs"
                  onClick={() => open(s.id, s.session === 'Race' ? 'replay' : 'lap-duel')}
                >
                  {s.session === 'Race' ? <ChequeredFlagIcon /> : <StartLightsIcon />}
                  {s.session === 'Race' ? 'Replay' : `${s.session} telemetry`}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 @min-[560px]:grid-cols-3 @min-[1000px]:grid-cols-6">
            <StatTile
              label="Winner"
              value={<DriverLink data={data} driver={head.winner?.driver} className="text-base" />}
            />
            <StatTile
              label="Pole"
              value={<DriverLink data={data} driver={head.pole?.driver} className="text-base" />}
            />
            <StatTile
              label="Fastest lap"
              value={
                <DriverLink data={data} driver={head.fastestLap?.driver} className="text-base" />
              }
              detail={
                head.fastestLap?.time != null ? formatMillis(head.fastestLap.time) : undefined
              }
            />
            <StatTile
              label="Driver of the Day"
              value={
                head.driverOfTheDay ? (
                  <DriverLink
                    data={data}
                    driver={head.driverOfTheDay.driver}
                    className="text-base"
                  />
                ) : (
                  <span className="text-base text-muted-foreground">
                    {season.year < 2016 ? 'Not held' : '—'}
                  </span>
                )
              }
              detail={
                head.driverOfTheDay?.percentage
                  ? `${head.driverOfTheDay.percentage}% of votes`
                  : undefined
              }
            />
            <StatTile
              label="Distance"
              value={w.laps ? `${w.laps} laps` : '—'}
              detail={
                w.distance
                  ? `${w.distance.toFixed(1)} km${w.scheduledLaps && w.scheduledLaps !== w.laps ? `, ${w.scheduledLaps} planned` : ''}`
                  : undefined
              }
            />
            <StatTile
              label="Finishers"
              value={head.starters ? `${head.finishers} / ${head.starters}` : '—'}
            />
          </div>
        </CardContent>
      </Card>

      {tab ? (
        <Tabs
          value={tab}
          onValueChange={(v) => setArchive({ session: v })}
          className="min-w-0 gap-3"
        >
          <ScrollTabsList aria-label="Weekend sessions">
            {sessions.map((s) => (
              <TabsTrigger key={s} value={s}>
                {SESSION_LABELS[s]}
              </TabsTrigger>
            ))}
          </ScrollTabsList>
          {sessions.map((s) => (
            <TabsContent key={s} value={s} className="min-w-0">
              <Card className="p-0">
                <SessionTable data={data} session={s} rows={w.sessions[s] ?? []} />
              </Card>
              {w.schedule[s] && (
                <HelpText className="mt-2">
                  {SESSION_LABELS[s]} ran {formatEventDate(w.schedule[s]!.slice(0, 10))}
                  {w.schedule[s]!.length > 10 ? ` at ${w.schedule[s]!.slice(11)} local time` : ''}.
                </HelpText>
              )}
              {s === 'pitStops' && (
                <HelpText className="mt-2">
                  Times are the whole trip down the pit lane, not the stop alone, so they depend on
                  the pit lane&apos;s length.
                </HelpText>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <HelpText>
          This weekend hasn&apos;t run yet. Sessions appear here once F1DB records them.
        </HelpText>
      )}
    </m.div>
  )
}
