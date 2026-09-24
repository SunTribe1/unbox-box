'use client'

import { findWeekend } from '@unbox-box/tools'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp } from '@/lib/store'
import { useSeasonArchive } from '../archive/use-archive'
import { useHistoryData } from '../history/use-history'
import { SeasonPage } from './season-page'
import { WeekendPage } from './weekend-page'

/** Race Archive: a season's calendar, entry list and stats, and a page per weekend with
 *  every session F1DB has (practice, qualifying, grid, sprint, race, pit stops...). */
export function RacesView() {
  const history = useHistoryData()
  const archive = useApp((s) => s.archive)
  const latest = history.data?.index.latestSeason
  const upcoming = history.data?.index.calendar.at(-1)?.year
  const lastYear = Math.max(latest ?? 0, upcoming ?? 0)
  const year =
    archive.season && archive.season >= 1950 && archive.season <= lastYear ? archive.season : latest
  const season = useSeasonArchive(year)

  const error = history.error ?? season.error
  if (error) return <ErrorState title="Race archive unavailable" error={error} />
  if (!history.data || !season.data || !year) {
    return (
      <div className="grid gap-4" aria-busy aria-label="Loading race archive">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-3 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }
  const weekend = archive.round ? findWeekend(season.data, archive.round) : undefined
  return weekend ? (
    <WeekendPage data={history.data} season={season.data} weekend={weekend} />
  ) : (
    <SeasonPage data={history.data} season={season.data} lastYear={lastYear} />
  )
}
