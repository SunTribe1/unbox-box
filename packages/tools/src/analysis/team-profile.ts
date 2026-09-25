import type { HistoryData, HistoryStandings } from '../data/schema'
import { finalPositions, mainTeam } from './profiles'
/** Team profiles: every name a team raced under, its seasons, drivers and titles. */

export interface TeamSeason {
  year: number
  races: number
  wins: number
  podiums: number
  poles: number
  /** Points its drivers scored in Grands Prix (sprints are in the official standings). */
  points: number
  drivers: number[]
  champion: boolean
  position: number | null
}

export interface TeamProfile {
  /** Every name the team raced under, oldest first (Toleman, Benetton, Renault...). */
  lineage: { constructor: number; name: string; from: number; to: number | null }[]
  seasons: TeamSeason[]
  drivers: { driver: number; from: number; to: number; starts: number; wins: number }[]
  driverTitles: { year: number; driver: number }[]
  /** Totals across every name in the lineage, counting each name only for its own years. */
  combined: { races: number; wins: number; podiums: number; titles: number } | null
}

export function teamProfile(
  data: HistoryData,
  constructor: number,
  standings?: HistoryStandings,
): TeamProfile {
  const r = data.results
  const years = data.index.races.year
  const seasons = new Map<number, TeamSeason & { raceSet: Set<number> }>()
  const drivers = new Map<number, { from: number; to: number; starts: number; wins: number }>()
  const positions = standings
    ? finalPositions(data, standings.constructors, constructor)
    : new Map<number, number>()
  const titles = new Set(
    data.index.constructorChampions.filter((c) => c.constructor === constructor).map((c) => c.year),
  )
  for (let row = 0; row < r.race.length; row++) {
    if (r.constructor[row] !== constructor) continue
    const year = years[r.race[row]!]!
    const s =
      seasons.get(year) ??
      ({
        year,
        races: 0,
        wins: 0,
        podiums: 0,
        poles: 0,
        points: 0,
        drivers: [],
        champion: titles.has(year),
        position: positions.get(year) ?? null,
        raceSet: new Set<number>(),
      } satisfies TeamSeason & { raceSet: Set<number> })
    s.raceSet.add(r.race[row]!)
    if (r.pos[row] === 1) s.wins++
    if (r.pos[row]! >= 1 && r.pos[row]! <= 3) s.podiums++
    s.poles += r.pole[row]!
    s.points += r.points[row]!
    const d = r.driver[row]!
    if (!s.drivers.includes(d)) s.drivers.push(d)
    seasons.set(year, s)
    const entry = drivers.get(d) ?? { from: year, to: year, starts: 0, wins: 0 }
    entry.to = Math.max(entry.to, year)
    entry.starts++
    if (r.pos[row] === 1) entry.wins++
    drivers.set(d, entry)
  }

  // Driver titles won in this team's car: the champion scored most of their points here.
  const driverTitles = data.index.champions.filter((c) => {
    const s = seasons.get(c.year)
    return s?.drivers.includes(c.driver) && mainTeam(data, c.driver, c.year) === constructor
  })

  const parent =
    data.index.lineage.find((l) => l.constructor === constructor || l.parent === constructor)
      ?.parent ?? constructor
  const lineage = data.index.lineage
    .filter((l) => l.parent === parent)
    .map((l) => ({
      constructor: l.constructor,
      name: data.index.constructors[l.constructor]?.name ?? '',
      from: l.from,
      to: l.to,
    }))
    .sort((a, b) => a.from - b.from)

  const inLineage = (c: number, year: number) =>
    lineage.some((l) => l.constructor === c && year >= l.from && year <= (l.to ?? Infinity))
  let combined: TeamProfile['combined'] = null
  if (lineage.length > 1) {
    const races = new Set<number>()
    combined = { races: 0, wins: 0, podiums: 0, titles: 0 }
    for (let row = 0; row < r.race.length; row++) {
      if (!inLineage(r.constructor[row]!, years[r.race[row]!]!)) continue
      races.add(r.race[row]!)
      if (r.pos[row] === 1) combined.wins++
      if (r.pos[row]! >= 1 && r.pos[row]! <= 3) combined.podiums++
    }
    combined.races = races.size
    combined.titles = data.index.constructorChampions.filter((c) =>
      inLineage(c.constructor, c.year),
    ).length
  }

  return {
    lineage,
    combined,
    seasons: [...seasons.values()]
      .map(({ raceSet, ...s }) => ({ ...s, races: raceSet.size }))
      .sort((a, b) => a.year - b.year),
    drivers: [...drivers]
      .sort(([, a], [, b]) => b.starts - a.starts)
      .map(([driver, d]) => ({ driver, ...d })),
    driverTitles,
  }
}
