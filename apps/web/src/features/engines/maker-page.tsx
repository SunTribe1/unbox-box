'use client'

import { makerProfile, type Catalog, type HistoryData, type MakerKind } from '@unbox-box/tools'
import { m } from 'motion/react'
import { useMemo } from 'react'
import { Flag } from '@/components/flag'
import { BackButton } from '@/components/back-button'
import { HelpText } from '@/components/help-text'
import { EngineIcon, PodiumIcon, StrategyIcon, TrophyIcon, TyreIcon } from '@/components/icons'
import { StatTile } from '@/components/stat-tile'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { enter } from '@/lib/motion'
import { useApp } from '@/lib/store'
import { teamColor } from '@/lib/teams'
import { useThemeName } from '@/lib/use-team-colors'
import { TeamLink } from '../archive/links'
import { SeasonBars } from '../history/profile-parts'

/** One engine or tyre maker: totals, wins by season, the teams it supplied, and (engines)
 *  what it built in each era and the titles it powered. */
export function MakerPage({
  data,
  catalog,
  kind,
  maker,
}: {
  data: HistoryData
  catalog: Catalog
  kind: MakerKind
  maker: number
}) {
  const setArchive = useApp((s) => s.setArchive)
  const theme = useThemeName()
  const mk = (kind === 'engine' ? catalog.engineMakers : catalog.tyreMakers)[maker]!
  const p = useMemo(() => makerProfile(data, catalog, kind, maker), [data, catalog, kind, maker])
  const titles = new Set(p.titleYears)
  const team = (i: number) => data.index.constructors[i]?.name ?? ''
  const Icon = kind === 'engine' ? EngineIcon : TyreIcon
  const bars = p.seasons.map((s) => {
    const lead = s.teams[0]
    return {
      year: s.year,
      value: s.wins,
      champion: titles.has(s.year),
      label: `${s.wins} win${s.wins === 1 ? '' : 's'} from ${s.starts} starts${s.pos ? `, P${s.pos}` : ''}`,
      color: lead != null && s.teams.length === 1 ? teamColor(team(lead), theme) : undefined,
    }
  })

  return (
    <m.div className="grid gap-4" {...enter}>
      <div>
        <BackButton onClick={() => setArchive({ maker: undefined })}>
          All {kind === 'engine' ? 'engines' : 'tyres'}
        </BackButton>
      </div>
      <Card>
        <CardContent className="grid gap-4 pt-4 sm:pt-5">
          <div className="grid gap-1">
            <span className="text-label text-muted-foreground">
              {kind === 'engine' ? 'Engine maker' : 'Tyre maker'}
            </span>
            <h2 className="flex items-center gap-2.5 text-display">
              <Flag code={mk.country} className="h-4 w-[22px]" />
              {mk.name}
            </h2>
            <p className="numeric text-sm text-muted-foreground">
              {mk.firstYear}–{mk.lastYear} · {p.seasons.length} seasons · {p.teams.length} teams
              supplied
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 @min-[560px]:grid-cols-3 @min-[1000px]:grid-cols-6">
            <StatTile label="Starts" value={mk.starts} />
            <StatTile
              label="Wins"
              value={mk.wins}
              detail={
                mk.starts ? `${((mk.wins / mk.starts) * 100).toFixed(1)}% of starts` : undefined
              }
            />
            <StatTile label="Podiums" value={mk.podiums} />
            <StatTile label="Poles" value={mk.poles} />
            <StatTile label="Fastest laps" value={mk.fastestLaps} />
            <StatTile
              label={kind === 'engine' ? 'Constructors’ titles' : 'Seasons'}
              value={kind === 'engine' ? p.titleYears.length : p.seasons.length}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <PodiumIcon /> Wins by season
          </CardTitle>
          <CardDescription>
            {kind === 'engine' ? '★ constructors’ title with this engine; ' : ''}bars take the team
            colour when one team ran it
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeasonBars bars={bars} unit="wins" />
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 @min-[1000px]:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <StrategyIcon /> Teams supplied
            </CardTitle>
            <CardDescription>most seasons first</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1.5">
              {p.teams.slice(0, 24).map((t) => (
                <li key={t.constructor} className="flex items-center justify-between gap-2 text-sm">
                  <TeamLink data={data} team={t.constructor} />
                  <span className="shrink-0 numeric text-caption text-muted-foreground">
                    {t.from === t.to ? t.from : `${t.from}–${t.to}`} · {t.seasons} season
                    {t.seasons > 1 ? 's' : ''}
                  </span>
                </li>
              ))}
            </ul>
            {p.teams.length > 24 && (
              <HelpText className="mt-3">And {p.teams.length - 24} more.</HelpText>
            )}
          </CardContent>
        </Card>

        {kind === 'engine' ? (
          <Card>
            <CardHeader>
              <CardTitle>
                <Icon /> What it built
              </CardTitle>
              <CardDescription>engine specifications by era</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <ul className="grid gap-2">
                {p.eras.map((e) => (
                  <li key={`${e.label}-${e.from}`} className="grid gap-0.5">
                    <span className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium">{e.label}</span>
                      <span className="numeric text-caption text-muted-foreground">
                        {e.from === e.to ? e.from : `${e.from}–${e.to}`}
                      </span>
                    </span>
                    <span className="truncate text-caption text-muted-foreground">
                      {e.names.slice(0, 4).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
              {p.titleYears.length > 0 && (
                <div className="grid gap-1.5 border-t pt-3">
                  <span className="flex items-center gap-1.5 text-label text-muted-foreground">
                    <TrophyIcon className="size-3.5" aria-hidden /> Constructors’ titles powered
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {p.titleYears.map((y) => (
                      <Badge key={y} variant="outline" className="numeric">
                        {y}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                <Icon /> Best seasons
              </CardTitle>
              <CardDescription>most wins</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-1.5">
                {[...p.seasons]
                  .sort((a, b) => b.wins - a.wins)
                  .slice(0, 10)
                  .map((s) => (
                    <li key={s.year} className="flex justify-between gap-2 text-sm">
                      <span className="numeric">{s.year}</span>
                      <span className="numeric text-muted-foreground">
                        {s.wins} wins · {s.poles} poles · {s.teams.length} teams
                      </span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </m.div>
  )
}
