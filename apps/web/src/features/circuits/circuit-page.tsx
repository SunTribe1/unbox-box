'use client'

import {
  circuitProfile,
  formatLapTime,
  type CircuitShapes,
  type HistoryData,
  type SessionIndex,
} from '@unbox-box/tools'
import { useQueries } from '@tanstack/react-query'
import { MapPinIcon } from 'lucide-react'
import { m } from 'motion/react'
import { useMemo } from 'react'
import { Flag } from '@/components/flag'
import { BackButton } from '@/components/back-button'
import { HelpText } from '@/components/help-text'
import {
  CircuitIcon,
  ChequeredFlagIcon,
  PodiumIcon,
  StartLightsIcon,
  StopwatchIcon,
} from '@/components/icons'
import { StatTile } from '@/components/stat-tile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GrowBar } from '@/components/ui/grow-bar'
import { metaQuery } from '@/lib/data'
import { formatEventDate } from '@/lib/format'
import { enter } from '@/lib/motion'
import { useApp } from '@/lib/store'
import { teamColor } from '@/lib/teams'
import { useThemeName } from '@/lib/use-team-colors'
import { CircuitCard } from '../history/circuit-card'
import { goTo } from '../shell/nav'
import { CircuitOutline } from './circuit-outline'

const DIRECTION: Record<string, string> = {
  CLOCKWISE: 'Clockwise',
  ANTI_CLOCKWISE: 'Anticlockwise',
}
const TYPE: Record<string, string> = { RACE: 'Permanent', STREET: 'Street', ROAD: 'Road' }

/** One circuit: its layout, facts, record book, and the sessions we have from it. */
export function CircuitPage({
  data,
  shapes,
  sessions,
  circuitId,
}: {
  data: HistoryData
  shapes?: CircuitShapes
  sessions: SessionIndex['sessions']
  circuitId: string
}) {
  const setCircuit = useApp((s) => s.setCircuit)
  const setSession = useApp((s) => s.setSession)
  const theme = useThemeName()
  const index = data.index.circuits.findIndex((c) => c.id === circuitId)
  const c = data.index.circuits[index]
  const profile = useMemo(() => (index >= 0 ? circuitProfile(data, index) : null), [data, index])
  const shape = shapes?.[circuitId]
  const ours = useMemo(
    () => sessions.filter((s) => s.circuitId === circuitId),
    [sessions, circuitId],
  )
  // Pole laps by year, from the qualifying sessions we have here.
  const qualis = ours.filter((s) => s.session === 'Qualifying')
  const metas = useQueries({ queries: qualis.map((s) => metaQuery(s.id)) })
  const poles = qualis
    .map((s, i) => {
      const meta = metas[i]?.data
      const pole = meta?.results[0]
      return pole?.time != null
        ? { season: s.season, time: pole.time, driver: pole.driver, track: meta!.weather.trackTemp }
        : null
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => a.season - b.season)

  if (!c || !profile) {
    return <p className="text-sm text-muted-foreground">Unknown circuit.</p>
  }
  const driver = (i: number) => data.index.drivers[i]?.name ?? ''
  const team = (i: number) => data.index.constructors[i]?.name ?? ''
  const maxWins = Math.max(1, ...profile.topDrivers.map((d) => d.wins))
  const fastestPole = Math.min(...poles.map((p) => p.time))
  const slowestPole = Math.max(...poles.map((p) => p.time))

  const open = (id: string, view: 'lap-duel' | 'replay') => {
    setSession(id)
    goTo(view)
  }

  return (
    <m.div className="grid gap-4" {...enter}>
      <div className="flex flex-wrap items-center gap-2">
        <BackButton onClick={() => setCircuit(null)}>All circuits</BackButton>
      </div>

      <Card className="overflow-hidden">
        <div className="grid gap-4 p-4 @min-[900px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] @min-[900px]:p-6">
          <div className="flex aspect-[4/3] max-h-[420px] items-center justify-center rounded-xl bg-surface-2/50 p-4">
            {shape ? (
              <CircuitOutline
                shape={shape}
                corners
                layoutId={`circuit-${circuitId}`}
                className="h-full w-full"
                label={`${c.name} layout with numbered corners`}
              />
            ) : (
              <div className="grid justify-items-center gap-2 text-center text-caption text-muted-foreground">
                <MapPinIcon className="size-8 text-faint-foreground" aria-hidden />
                No layout yet: we have no telemetry from here.
              </div>
            )}
          </div>
          <div className="grid content-start gap-4">
            <div className="grid gap-1">
              <h2 className="flex items-center gap-2 text-display">
                {c.code ? (
                  <Flag code={c.code} className="h-4 w-[22px]" />
                ) : (
                  <CircuitIcon className="size-6 text-muted-foreground" aria-hidden />
                )}
                {c.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {[c.fullName !== c.name && c.fullName, c.place, c.country]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {profile.next && (
                <Badge className="mt-1 w-fit border-transparent bg-signal-soft text-signal-ink">
                  Next: {profile.next.name} GP, {formatEventDate(profile.next.date)}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 @min-[560px]:grid-cols-3">
              <StatTile label="Length" value={c.length ? `${c.length.toFixed(3)} km` : '—'} />
              <StatTile label="Corners" value={c.turns ?? '—'} />
              <StatTile
                label="Direction"
                value={<span className="text-base">{DIRECTION[c.direction ?? ''] ?? '—'}</span>}
                detail={TYPE[c.type ?? ''] ? `${TYPE[c.type ?? '']} circuit` : undefined}
              />
              <StatTile
                label="Grands Prix"
                value={profile.races}
                detail={profile.firstYear ? `${profile.firstYear}–${profile.lastYear}` : undefined}
              />
              <StatTile
                label="Lap record"
                value={
                  <span className="text-base">
                    {profile.record ? formatLapTime(profile.record.time) : '—'}
                  </span>
                }
                detail={
                  profile.record
                    ? `${driver(profile.record.driver)}, ${profile.record.year}`
                    : undefined
                }
              />
              <StatTile
                label="Won from pole"
                value={profile.poleToWin != null ? `${Math.round(profile.poleToWin * 100)}%` : '—'}
                detail={
                  profile.winnerGrid != null
                    ? `avg winner grid P${profile.winnerGrid.toFixed(1)}`
                    : undefined
                }
              />
            </div>
            {c.layouts.length > 1 && (
              <div className="grid gap-1.5">
                <span className="text-label text-muted-foreground">
                  {c.layouts.length} layouts raced
                </span>
                <ol className="grid gap-1 text-caption">
                  {c.layouts.map((l, i) => (
                    <li
                      key={l.id}
                      className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 numeric"
                    >
                      <span className="text-muted-foreground">
                        {l.from === l.to ? l.from : `${l.from}–${l.to}`}
                      </span>
                      <span className="h-1 overflow-hidden rounded-full bg-surface-2">
                        <GrowBar
                          value={l.races / Math.max(...c.layouts.map((x) => x.races))}
                          className={i === c.layouts.length - 1 ? 'bg-signal' : 'bg-signal/50'}
                        />
                      </span>
                      <span>
                        {l.length ? `${l.length.toFixed(3)} km` : ''}
                        {l.turns ? ` · ${l.turns} turns` : ''} · {l.races} GP
                        {l.races > 1 ? 's' : ''}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {c.previousNames && <HelpText>Previously known as {c.previousNames}.</HelpText>}
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-4 @min-[1100px]:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              <PodiumIcon />
              Kings of {c.name}
            </CardTitle>
            <CardDescription>most wins here</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2.5">
            {profile.topDrivers.map((d) => (
              <div key={d.driver} className="grid gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate">{driver(d.driver)}</span>
                  <span className="numeric text-xs text-muted-foreground">
                    {d.wins} W · {d.podiums} P
                  </span>
                </div>
                <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <GrowBar value={d.wins / maxWins} className="rounded-full bg-signal/80" />
                </span>
              </div>
            ))}
            <div className="mt-2 grid gap-1.5 border-t pt-3">
              <span className="text-label text-muted-foreground">Teams</span>
              {profile.topTeams.map((t) => (
                <div key={t.constructor} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-3.5 w-[3px] rounded-full"
                    style={{ backgroundColor: teamColor(team(t.constructor), theme) }}
                    aria-hidden
                  />
                  <span className="truncate">{team(t.constructor)}</span>
                  <span className="ml-auto numeric text-xs text-muted-foreground">{t.wins} W</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <CircuitCard data={data} circuitId={circuitId} />

        <Card>
          <CardHeader>
            <CardTitle>
              <StopwatchIcon />
              In our data
            </CardTitle>
            <CardDescription>
              {ours.length ? `${ours.length} sessions with full telemetry` : 'no sessions yet'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {poles.length > 0 && (
              <div className="grid gap-2">
                <span className="text-label text-muted-foreground">Pole lap by year</span>
                {poles.map((p) => (
                  <div
                    key={p.season}
                    className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 text-sm"
                  >
                    <span className="numeric text-xs text-muted-foreground">{p.season}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <GrowBar
                        // Fastest pole fills the bar, so faster years read as longer.
                        value={
                          slowestPole > fastestPole
                            ? 0.35 + (0.65 * (slowestPole - p.time)) / (slowestPole - fastestPole)
                            : 1
                        }
                        className="rounded-full bg-sector-best/80"
                      />
                    </span>
                    <span className="numeric text-xs">
                      {formatLapTime(p.time)}{' '}
                      <span className="text-muted-foreground">{p.driver}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {ours.length > 0 ? (
              <ul className="grid gap-1.5">
                {ours.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      <span className="numeric text-muted-foreground">{s.season}</span> {s.session}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <Button variant="outline" size="xs" onClick={() => open(s.id, 'lap-duel')}>
                        <StartLightsIcon /> Duel
                      </Button>
                      {s.session === 'Race' && (
                        <Button variant="outline" size="xs" onClick={() => open(s.id, 'replay')}>
                          <ChequeredFlagIcon /> Replay
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Telemetry starts in 2023; this circuit hasn&apos;t been raced since.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <HelpText>
        History from F1DB (every Grand Prix since 1950). The lap record is the fastest race lap on
        today&apos;s layout; qualifying laps don&apos;t count. Pole laps come from our telemetry
        sessions.
      </HelpText>
    </m.div>
  )
}
