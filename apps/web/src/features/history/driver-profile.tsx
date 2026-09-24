'use client'

import { driverProfile, type HistoryData, type HistoryStandings } from '@unbox-box/tools'
import { ArrowLeftRightIcon } from 'lucide-react'
import { useMemo } from 'react'
import { DriverIcon, HelmetIcon, StrategyIcon, TrophyIcon } from '@/components/icons'
import { HelpText } from '@/components/help-text'
import { StatTile } from '@/components/stat-tile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useApp } from '@/lib/store'
import { teamColor } from '@/lib/teams'
import { useThemeName } from '@/lib/use-team-colors'
import { Flag } from '@/components/flag'
import { DriverExtras, lifeLine } from './driver-extras'
import { DriverPicker } from './driver-picker'
import { pct, RateRow, SeasonBars } from './profile-parts'

const ordinal = (n: number) =>
  `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`

/** One driver's whole career from F1DB: numbers, teams, seasons, teammates and circuits. */
export function DriverProfileView({
  data,
  standings,
  driver,
}: {
  data: HistoryData
  standings: HistoryStandings | undefined
  driver: number
}) {
  const setHistory = useApp((s) => s.setHistory)
  const theme = useThemeName()
  const d = data.index.drivers[driver]!
  const profile = useMemo(() => driverProfile(data, driver, standings), [data, driver, standings])
  const race = (i: number | null) =>
    i == null ? '—' : `${data.index.races.year[i]} ${data.index.races.name[i]}`
  const pick = (i: number) => setHistory({ tab: 'drivers', driver: data.index.drivers[i]!.id })
  const span = d.firstYear ? `${d.firstYear}–${d.active ? 'now' : d.lastYear}` : 'no starts'

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle className="flex items-center gap-2">
              {d.code ? <Flag code={d.code} className="h-3.5 w-5" /> : <DriverIcon />}
              {d.name}
              {d.active && (
                <Badge className="border-transparent bg-success/15 text-success">active</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {[
                d.fullName && d.fullName !== d.name && d.fullName,
                d.nationality,
                d.number && `#${d.number}`,
                lifeLine(data, driver),
                span,
              ]
                .filter(Boolean)
                .join(' · ')}
            </CardDescription>
          </div>
          <CardAction className="flex w-72 max-w-full items-center gap-2">
            <DriverPicker data={data} value={driver} onChange={pick} />
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-2 @min-[640px]:grid-cols-4 @min-[1000px]:grid-cols-8">
            <StatTile label="Titles" value={d.titles} />
            <StatTile label="Wins" value={d.wins} />
            <StatTile label="Podiums" value={d.podiums} />
            <StatTile label="Poles" value={d.poles} />
            <StatTile label="Fastest laps" value={d.fastestLaps} />
            <StatTile label="Starts" value={d.starts} />
            <StatTile label="Points" value={Math.round(d.points).toLocaleString('en-GB')} />
            <StatTile
              label="Best finish"
              value={d.bestChampionship ? ordinal(d.bestChampionship) : '—'}
              detail="championship"
            />
          </div>
          <DriverExtras data={data} driver={driver} />
          <div className="grid gap-4 @min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="grid content-start gap-2">
              <RateRow label="Win rate" value={profile.rates.win} />
              <RateRow label="Podium rate" value={profile.rates.podium} />
              <RateRow label="Pole rate" value={profile.rates.pole} />
              <RateRow label="Finish rate" value={profile.rates.finish} className="bg-success/70" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <StatTile
                  label="Places gained"
                  value={
                    profile.averageGain == null
                      ? '—'
                      : `${profile.averageGain >= 0 ? '+' : ''}${profile.averageGain.toFixed(1)}`
                  }
                  detail="grid to flag, average"
                />
                <StatTile
                  label="Best comeback"
                  value={
                    profile.bestComeback
                      ? `P${profile.bestComeback.grid} → P${profile.bestComeback.pos}`
                      : '—'
                  }
                  detail={profile.bestComeback ? race(profile.bestComeback.race) : undefined}
                />
              </div>
            </div>
            <div className="grid content-start gap-2">
              <span className="text-label text-muted-foreground">Points by season</span>
              <SeasonBars
                unit="points"
                bars={profile.seasons.map((s) => ({
                  year: s.year,
                  value: s.points,
                  champion: s.champion,
                  color: teamColor(s.teams.at(-1), theme),
                  label: `${s.points} pts${s.position ? `, ${ordinal(s.position)}` : ''} · ${s.teams.join(', ')} · ${s.wins} wins`,
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 @min-[1100px]:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              <StrategyIcon />
              Teams
            </CardTitle>
            <CardDescription>{profile.teams.length} stints</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-2">
              {profile.teams.map((t) => (
                <li key={`${t.name}-${t.from}`} className="flex items-center gap-3 text-sm">
                  <span
                    className="h-8 w-[3px] shrink-0 rounded-full"
                    style={{ backgroundColor: teamColor(t.name, theme) }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() =>
                        setHistory({
                          tab: 'teams',
                          team: data.index.constructors[t.constructor]?.id,
                        })
                      }
                      className="block truncate text-left font-medium hover:underline"
                    >
                      {t.name}
                    </button>
                    <span className="numeric text-caption text-muted-foreground">
                      {t.from === t.to ? t.from : `${t.from}–${t.to}`} · {t.starts} starts
                    </span>
                  </span>
                  <span className="text-right numeric text-xs text-muted-foreground">
                    {t.wins} W · {t.podiums} P
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <HelmetIcon />
              Teammates
            </CardTitle>
            <CardDescription>finished ahead in races together</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {profile.teammates.map((m) => {
              const mate = data.index.drivers[m.driver]!
              const decided = m.ahead + m.behind || 1
              return (
                <div key={m.driver} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => pick(m.driver)}
                      className="truncate text-left hover:underline"
                    >
                      {mate.name}
                    </button>
                    <span className="numeric text-xs text-muted-foreground">
                      {m.ahead}–{m.behind} · {m.races} races
                    </span>
                  </div>
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                    <span className="bg-signal/80" style={{ width: pct(m.ahead / decided) }} />
                  </div>
                </div>
              )
            })}
            {!profile.teammates.length && (
              <p className="text-sm text-muted-foreground">No teammates on record.</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() => setHistory({ tab: 'head-to-head', a: d.id })}
            >
              <ArrowLeftRightIcon /> Put {d.lastName} in the head-to-head
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <TrophyIcon />
              Best circuits
            </CardTitle>
            <CardDescription>
              first win {race(profile.firstWin)} · last {race(profile.lastWin)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.bestCircuits.length ? (
              <ol className="grid gap-2">
                {profile.bestCircuits.map((c, i) => (
                  <li
                    key={c.circuit}
                    className="grid grid-cols-[1.25rem_1fr_auto] items-baseline gap-2 text-sm"
                  >
                    <span className="numeric text-xs text-faint-foreground">{i + 1}</span>
                    <span className="truncate">{c.name}</span>
                    <span className="numeric text-xs text-muted-foreground">
                      {c.wins} W · {c.podiums} P · {c.starts} starts
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No podiums yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
      <HelpText>
        Rates are per Grand Prix start. Places gained counts classified finishes from a grid slot.
        Points are as scored at the time, so eras with different scoring don&apos;t compare
        directly.
      </HelpText>
    </div>
  )
}
