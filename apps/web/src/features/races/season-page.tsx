'use client'

import { weekendHeadline, type HistoryData, type SeasonArchive } from '@unbox-box/tools'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { m } from 'motion/react'
import { useMemo } from 'react'
import { HelpText } from '@/components/help-text'
import {
  ChequeredFlagIcon,
  DriverIcon,
  PodiumIcon,
  RaceArchiveIcon,
  StrategyIcon,
  TrophyIcon,
} from '@/components/icons'
import { PageHeader } from '@/components/page-header'
import { StatTile } from '@/components/stat-tile'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, ScrollTabsList, TabsTrigger } from '@/components/ui/tabs'
import { enter } from '@/lib/motion'
import { useApp } from '@/lib/store'
import { DriverLink, TeamLink } from '../archive/links'
import { useStandings } from '../history/use-history'
import { Championship } from './championship'
import { Calendar, EntryList, StatsTable } from './season-parts'

const SECTIONS = ['championship', 'calendar', 'entries', 'drivers', 'teams']

/** One season: the calendar (each weekend's winner and pole), the entry list, and the
 *  season's driver and team tables. */
export function SeasonPage({
  data,
  season,
  lastYear,
}: {
  data: HistoryData
  season: SeasonArchive
  lastYear: number
}) {
  const setArchive = useApp((s) => s.setArchive)
  const section = useApp((s) =>
    SECTIONS.includes(s.archive.section ?? '') ? s.archive.section! : 'championship',
  )
  const standings = useStandings(section === 'championship')
  const year = season.year
  const go = (y: number) => setArchive({ season: y, round: undefined, session: undefined })
  const years = useMemo(
    () => Array.from({ length: lastYear - 1949 }, (_, i) => lastYear - i),
    [lastYear],
  )
  const champion = data.index.champions.find((c) => c.year === year)
  const teamChampion = data.index.constructorChampions.find((c) => c.year === year)
  const held = season.races.filter((r) => r.sessions.race?.length)
  const winners = new Set(held.map((r) => weekendHeadline(r).winner?.driver))
  const sprints = season.races.filter((r) => r.sessions.sprint?.length).length

  return (
    <m.div className="grid gap-4" {...enter}>
      <PageHeader
        icon={RaceArchiveIcon}
        title={`${year} season`}
        description={
          <>
            {held.length} of {season.races.length} rounds raced
            {sprints ? `, ${sprints} with a sprint` : ''}. Open a weekend for every session.
          </>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous season"
              disabled={year <= 1950}
              onClick={() => go(year - 1)}
            >
              <ChevronLeftIcon />
            </Button>
            <Select value={String(year)} onValueChange={(v) => go(Number(v))}>
              <SelectTrigger className="w-28" aria-label="Season">
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
            <Button
              variant="outline"
              size="icon"
              aria-label="Next season"
              disabled={year >= lastYear}
              onClick={() => go(year + 1)}
            >
              <ChevronRightIcon />
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 @min-[700px]:grid-cols-4">
        <StatTile
          label="Drivers’ champion"
          value={
            champion ? (
              <DriverLink data={data} driver={champion.driver} className="text-base" />
            ) : (
              <span className="text-base text-muted-foreground">To be decided</span>
            )
          }
        />
        <StatTile
          label="Constructors’ champion"
          value={
            teamChampion ? (
              <TeamLink data={data} team={teamChampion.constructor} className="text-base" />
            ) : (
              <span className="text-base text-muted-foreground">
                {year < 1958 ? 'Not awarded' : 'To be decided'}
              </span>
            )
          }
        />
        <StatTile label="Different winners" value={winners.size} />
        <StatTile
          label="Drivers entered"
          value={new Set(season.entries.filter((e) => !e.test).map((e) => e.driver)).size}
        />
      </div>

      <Tabs
        value={section}
        onValueChange={(v) => setArchive({ section: v })}
        className="min-w-0 gap-4"
      >
        <ScrollTabsList aria-label="Season sections">
          <TabsTrigger value="championship">
            <TrophyIcon /> Championship
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <ChequeredFlagIcon /> Calendar
          </TabsTrigger>
          <TabsTrigger value="entries">
            <StrategyIcon /> Entry list
          </TabsTrigger>
          <TabsTrigger value="drivers">
            <DriverIcon /> Drivers
          </TabsTrigger>
          <TabsTrigger value="teams">
            <PodiumIcon /> Teams
          </TabsTrigger>
        </ScrollTabsList>
        <TabsContent value="championship">
          <Championship data={data} standings={standings.data} season={year} />
        </TabsContent>
        <TabsContent value="calendar">
          <Calendar data={data} season={season} />
        </TabsContent>
        <TabsContent value="entries">
          <EntryList data={data} season={season} />
        </TabsContent>
        <TabsContent value="drivers">
          <StatsTable data={data} rows={season.drivers} kind="driver" />
        </TabsContent>
        <TabsContent value="teams">
          {season.constructors.length ? (
            <StatsTable data={data} rows={season.constructors} kind="team" />
          ) : (
            <HelpText>No team table for {year}.</HelpText>
          )}
        </TabsContent>
      </Tabs>
      <HelpText>
        From F1DB (CC BY 4.0). Seasons before 1961 include the Indianapolis 500, which counted
        toward the championship.
      </HelpText>
    </m.div>
  )
}
