'use client'

import { teamProfile, type HistoryData, type HistoryStandings } from '@unbox-box/tools'
import { ChevronRightIcon } from 'lucide-react'
import { useMemo } from 'react'
import { DriverIcon, PodiumIcon, StrategyIcon, TrophyIcon } from '@/components/icons'
import { HelpText } from '@/components/help-text'
import { StatTile } from '@/components/stat-tile'
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
import { SeasonBars } from './profile-parts'
import { TeamCars } from './team-cars'
import { TeamPicker } from './team-picker'
import { Flag } from '@/components/flag'

/** A constructor's story: every name it raced under, its seasons, drivers and titles. */
export function TeamProfileView({
  data,
  standings,
  team,
}: {
  data: HistoryData
  standings: HistoryStandings | undefined
  team: number
}) {
  const setHistory = useApp((s) => s.setHistory)
  const theme = useThemeName()
  const c = data.index.constructors[team]!
  const color = teamColor(c.name, theme)
  const profile = useMemo(() => teamProfile(data, team, standings), [data, team, standings])
  const current = useMemo(() => {
    const latest = data.index.latestSeason
    const set = new Set<number>()
    data.results.race.forEach((race, row) => {
      if (data.index.races.year[race] === latest) set.add(data.results.constructor[row]!)
    })
    return set
  }, [data])
  const titles = profile.seasons.filter((s) => s.champion).map((s) => s.year)
  const first = profile.seasons[0]?.year
  const last = profile.seasons.at(-1)?.year
  const driverName = (i: number) => data.index.drivers[i]?.name ?? ''
  const combined = profile.combined

  return (
    <div className="grid gap-4">
      <Card className="relative overflow-hidden">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: color }}
        />
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle className="flex items-center gap-2">
              {c.code ? <Flag code={c.code} className="h-3.5 w-5" /> : <StrategyIcon />}
              {c.name}
            </CardTitle>
            <CardDescription>
              {[c.fullName !== c.name && c.fullName, c.country, first && `${first}–${last}`]
                .filter(Boolean)
                .join(' · ')}
            </CardDescription>
          </div>
          <CardAction className="w-72 max-w-full">
            <TeamPicker
              data={data}
              value={team}
              current={current}
              onChange={(i) => setHistory({ tab: 'teams', team: data.index.constructors[i]!.id })}
            />
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {profile.lineage.length > 1 && (
            <div className="grid gap-1.5">
              <span className="text-label text-muted-foreground">Raced as</span>
              <ol className="flex flex-wrap items-center gap-1 text-sm">
                {profile.lineage.map((l, i) => (
                  <li key={`${l.name}-${l.from}`} className="flex items-center gap-1">
                    {i > 0 && (
                      <ChevronRightIcon className="size-3.5 text-faint-foreground" aria-hidden />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setHistory({
                          tab: 'teams',
                          team: data.index.constructors[l.constructor]!.id,
                        })
                      }
                      className={
                        l.constructor === team
                          ? 'rounded-md bg-surface-2 px-2 py-0.5 font-medium'
                          : 'rounded-md px-2 py-0.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                      }
                    >
                      {l.name}{' '}
                      <span className="numeric text-caption text-faint-foreground">
                        {l.from}–{l.to ?? 'now'}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              {combined && (
                <p className="numeric text-caption text-muted-foreground">
                  Every name together: {combined.wins} wins · {combined.podiums} podiums ·{' '}
                  {combined.titles} team titles · {combined.races} races
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 @min-[640px]:grid-cols-4 @min-[1000px]:grid-cols-8">
            <StatTile label="Team titles" value={c.titles ?? titles.length} />
            <StatTile label="Driver titles" value={profile.driverTitles.length} />
            <StatTile label="Wins" value={c.wins ?? 0} />
            <StatTile label="1–2 finishes" value={c.oneTwos ?? 0} />
            <StatTile label="Podiums" value={c.podiums ?? 0} />
            <StatTile label="Poles" value={c.poles ?? 0} />
            <StatTile label="Fastest laps" value={c.fastestLaps ?? 0} />
            <StatTile label="Starts" value={c.starts ?? 0} />
          </div>
          <div className="grid gap-2">
            <span className="text-label text-muted-foreground">Podiums by season</span>
            <SeasonBars
              unit="podiums"
              bars={profile.seasons.map((s) => ({
                year: s.year,
                value: s.podiums,
                champion: s.champion,
                color,
                label: `${s.wins} wins, ${s.podiums} podiums${s.position ? `, P${s.position} in the championship` : ''} · ${s.drivers.map(driverName).join(', ')}`,
              }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 @min-[1100px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>
              <DriverIcon />
              Drivers
            </CardTitle>
            <CardDescription>{profile.drivers.length} drivers, most starts first</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-1 @min-[700px]:grid-cols-2 @min-[700px]:gap-x-6">
              {profile.drivers.slice(0, 20).map((d) => (
                <li key={d.driver}>
                  <button
                    type="button"
                    onClick={() =>
                      setHistory({ tab: 'drivers', driver: data.index.drivers[d.driver]!.id })
                    }
                    className="grid w-full grid-cols-[1fr_auto] items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-2"
                  >
                    <span className="truncate">{driverName(d.driver)}</span>
                    <span className="numeric text-xs text-muted-foreground">
                      {d.from === d.to ? d.from : `${d.from}–${d.to}`} · {d.starts} · {d.wins} W
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <TrophyIcon />
              Titles
            </CardTitle>
            <CardDescription>
              {titles.length} constructors&apos; · {profile.driverTitles.length} drivers&apos;
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="grid gap-1.5">
              <span className="text-label text-muted-foreground">Constructors&apos;</span>
              <p className="numeric leading-relaxed">
                {titles.length ? titles.join(' · ') : 'None yet'}
              </p>
            </div>
            <div className="grid gap-1.5">
              <span className="text-label text-muted-foreground">
                Drivers&apos; titles in this car
              </span>
              {profile.driverTitles.length ? (
                <ul className="grid gap-1">
                  {profile.driverTitles.map((t) => (
                    <li key={t.year} className="flex items-center gap-2">
                      <PodiumIcon className="size-3.5 text-signal-ink" aria-hidden />
                      <span className="w-10 numeric text-muted-foreground">{t.year}</span>
                      {driverName(t.driver)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">None yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <TeamCars data={data} team={team} />
      <HelpText>
        &quot;Raced as&quot; follows the team through every name change in F1DB. The
        constructors&apos; championship began in 1958.
      </HelpText>
    </div>
  )
}
