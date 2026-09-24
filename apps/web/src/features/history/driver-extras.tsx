'use client'

import { daysBetween, familyOf, type HistoryData } from '@unbox-box/tools'
import { Flag } from '@/components/flag'
import { StatTile } from '@/components/stat-tile'
import { formatEventDate } from '@/lib/format'
import { DriverLink } from '../archive/links'
import { useCatalog } from '../archive/use-archive'

const years = (from: string, to: string) => Math.floor(daysBetween(from, to) / 365.2425)

/** "Born 30 Sept 1997 in Hasselt, Belgium (29)" / "1929–1994". */
export function lifeLine(data: HistoryData, driver: number): string | null {
  const d = data.index.drivers[driver]
  if (!d?.dob) return null
  const today = new Date().toISOString().slice(0, 10)
  const born = `Born ${formatEventDate(d.dob)}${d.birthplace ? ` in ${d.birthplace}` : ''}`
  return d.dod
    ? `${born}; died ${formatEventDate(d.dod)}, aged ${years(d.dob, d.dod)}`
    : `${born} (${years(d.dob, today)})`
}

/** The second row of a driver profile: the rest of F1DB's career totals, plus any
 *  relatives who also raced. */
export function DriverExtras({ data, driver }: { data: HistoryData; driver: number }) {
  const catalog = useCatalog()
  const d = data.index.drivers[driver]!
  const family = catalog.data ? familyOf(data, catalog.data, driver) : []
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-2 @min-[480px]:grid-cols-3 @min-[1100px]:grid-cols-6">
        <StatTile
          label="Entries"
          value={d.entries ?? '—'}
          detail={
            d.entries && d.entries > d.starts ? `${d.entries - d.starts} did not start` : undefined
          }
        />
        <StatTile label="Laps raced" value={d.laps?.toLocaleString('en-GB') ?? '—'} />
        <StatTile
          label="Best grid"
          value={d.bestGrid ? `P${d.bestGrid}` : '—'}
          detail={d.bestRace ? `best race result P${d.bestRace}` : undefined}
        />
        <StatTile
          label="Grand slams"
          value={d.grandSlams ?? 0}
          detail="pole, win, fastest lap, led every lap"
        />
        <StatTile
          label="Sprint wins"
          value={d.sprintWins ?? 0}
          detail={d.sprintStarts ? `from ${d.sprintStarts} sprints` : undefined}
        />
        <StatTile label="Driver of the Day" value={d.dotd ?? 0} detail="fan vote, since 2016" />
      </div>
      {(family.length > 0 || d.code2) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          {d.code2 && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              Also holds <Flag code={d.code2} />{' '}
              {catalog.data?.countries.find((c) => c.code === d.code2)?.name ?? d.code2} nationality
            </span>
          )}
          {family.length > 0 && (
            <span className="text-label text-muted-foreground">Family in F1</span>
          )}
          {family.map((f) => (
            <span key={f.driver} className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{f.relation}</span>
              <DriverLink data={data} driver={f.driver} />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
