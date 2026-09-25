import type { HistoryData, HistoryDriver } from '../data/schema'
import { stripAccents } from '../util/text'

/** All-time analysis over F1DB data (1950 to present). Drivers are referenced by their index
 *  in `index.drivers`; results are parallel arrays (see pipeline/unbox_box_pipeline/history.py). */

function norm(text: string): string {
  return stripAccents(text)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export class HistoryLookupError extends Error {
  override name = 'HistoryLookupError'
}

/** Finds a driver from any era by full name, last name, first name, F1DB id or (for current
 *  drivers) three-letter code. Ambiguous names go to the more successful driver. */
export function resolveHistoricDriver(data: HistoryData, query: string): number {
  const q = norm(query)
  if (!q) throw new HistoryLookupError('Which driver?')
  let best = -1
  let bestScore = 0
  data.index.drivers.forEach((d, i) => {
    const full = norm(d.name)
    const last = norm(d.lastName)
    const first = norm(d.firstName)
    let score = 0
    if (d.id === q.replace(/ /g, '-') || full === q) score = 100
    else if (d.active && norm(d.abbr) === q) score = 90
    else if (last === q) score = 60
    else if (full.endsWith(` ${q}`) || full.startsWith(`${q} `)) score = 50
    else if (first === q) score = 30
    else if (q.length >= 4 && full.includes(q)) score = 20
    if (!score) return
    // Tie-break toward the better-known driver.
    score += Math.min(9.9, d.wins / 10 + d.starts / 100 + d.titles)
    if (score > bestScore) {
      best = i
      bestScore = score
    }
  })
  if (best < 0) throw new HistoryLookupError(`No Formula 1 driver matches "${query}".`)
  return best
}

export function historicDriver(data: HistoryData, i: number): HistoryDriver {
  return data.index.drivers[i]!
}

export interface Filters {
  from?: number | undefined
  to?: number | undefined
  circuit?: number | undefined
}

function rowsFor(data: HistoryData, filters: Filters = {}): number[] {
  const { race } = data.results
  const { year, circuit } = data.index.races
  const out: number[] = []
  for (let r = 0; r < race.length; r++) {
    const ri = race[r]!
    const y = year[ri]!
    if (filters.from != null && y < filters.from) continue
    if (filters.to != null && y > filters.to) continue
    if (filters.circuit != null && circuit[ri] !== filters.circuit) continue
    out.push(r)
  }
  return out
}

export const STATS = [
  'wins',
  'podiums',
  'poles',
  'fastestLaps',
  'starts',
  'points',
  'titles',
] as const
export type Stat = (typeof STATS)[number]

export const STAT_LABELS: Record<Stat, string> = {
  wins: 'Wins',
  podiums: 'Podiums',
  poles: 'Pole positions',
  fastestLaps: 'Fastest laps',
  starts: 'Starts',
  points: 'Points',
  titles: 'Championships',
}

export interface RankingRow {
  driver: number
  value: number
}

/** Leaderboard for a stat, computed from race results so filters (years, circuit) apply. */
export function ranking(
  data: HistoryData,
  stat: Stat,
  filters: Filters = {},
  limit = 20,
): RankingRow[] {
  const totals = new Map<number, number>()
  const add = (d: number, v: number) => totals.set(d, (totals.get(d) ?? 0) + v)
  if (stat === 'titles') {
    for (const c of data.index.champions) {
      if (filters.from != null && c.year < filters.from) continue
      if (filters.to != null && c.year > filters.to) continue
      add(c.driver, 1)
    }
  } else {
    const r = data.results
    for (const row of rowsFor(data, filters)) {
      const d = r.driver[row]!
      if (stat === 'wins') add(d, r.pos[row] === 1 ? 1 : 0)
      else if (stat === 'podiums') add(d, r.pos[row]! >= 1 && r.pos[row]! <= 3 ? 1 : 0)
      else if (stat === 'poles') add(d, r.pole[row]!)
      else if (stat === 'fastestLaps') add(d, r.fastestLap[row]!)
      else if (stat === 'starts') add(d, 1)
      else if (stat === 'points') add(d, r.points[row]!)
    }
  }
  return [...totals.entries()]
    .filter(([, v]) => v > 0)
    .map(([driver, value]) => ({ driver, value }))
    .sort(
      (a, b) =>
        b.value - a.value ||
        historicDriver(data, a.driver).name.localeCompare(historicDriver(data, b.driver).name),
    )
    .slice(0, limit)
}

export interface Season {
  year: number
  starts: number
  wins: number
  podiums: number
  poles: number
  points: number
  champion: boolean
}

export function careerBySeason(data: HistoryData, driver: number): Season[] {
  const seasons = new Map<number, Season>()
  const r = data.results
  for (let row = 0; row < r.race.length; row++) {
    if (r.driver[row] !== driver) continue
    const year = data.index.races.year[r.race[row]!]!
    const s = seasons.get(year) ?? {
      year,
      starts: 0,
      wins: 0,
      podiums: 0,
      poles: 0,
      points: 0,
      champion: false,
    }
    s.starts++
    if (r.pos[row] === 1) s.wins++
    if (r.pos[row]! >= 1 && r.pos[row]! <= 3) s.podiums++
    s.poles += r.pole[row]!
    s.points += r.points[row]!
    seasons.set(year, s)
  }
  for (const c of data.index.champions) {
    const s = seasons.get(c.year)
    if (s && c.driver === driver) s.champion = true
  }
  return [...seasons.values()].sort((a, b) => a.year - b.year)
}

export interface HeadToHead {
  a: HistoryDriver
  b: HistoryDriver
  together: number
  finishedAhead: { a: number; b: number }
  startedAhead: { a: number; b: number }
  teammateRaces: number
  teammateAhead: { a: number; b: number }
  firstShared: number | null
  lastShared: number | null
}

/** Races both drivers started: who finished ahead (classified beats unclassified), who
 *  started ahead, and the same split for races as teammates. */
export function headToHead(data: HistoryData, a: number, b: number): HeadToHead {
  const r = data.results
  const byRace = new Map<number, { a?: number; b?: number }>()
  for (let row = 0; row < r.race.length; row++) {
    const d = r.driver[row]
    if (d !== a && d !== b) continue
    const entry = byRace.get(r.race[row]!) ?? {}
    entry[d === a ? 'a' : 'b'] = row
    byRace.set(r.race[row]!, entry)
  }
  const out: HeadToHead = {
    a: historicDriver(data, a),
    b: historicDriver(data, b),
    together: 0,
    finishedAhead: { a: 0, b: 0 },
    startedAhead: { a: 0, b: 0 },
    teammateRaces: 0,
    teammateAhead: { a: 0, b: 0 },
    firstShared: null,
    lastShared: null,
  }
  const rank = (row: number) => (r.pos[row]! > 0 ? r.pos[row]! : 1000)
  for (const [race, e] of byRace) {
    if (e.a == null || e.b == null) continue
    out.together++
    const y = data.index.races.year[race]!
    out.firstShared = out.firstShared == null ? y : Math.min(out.firstShared, y)
    out.lastShared = out.lastShared == null ? y : Math.max(out.lastShared, y)
    const ra = rank(e.a)
    const rb = rank(e.b)
    const aheadA = ra < rb
    if (ra !== rb) out.finishedAhead[aheadA ? 'a' : 'b']++
    const ga = r.grid[e.a]!
    const gb = r.grid[e.b]!
    if (ga > 0 && gb > 0 && ga !== gb) out.startedAhead[ga < gb ? 'a' : 'b']++
    if (r.constructor[e.a] === r.constructor[e.b] && r.constructor[e.a]! >= 0) {
      out.teammateRaces++
      if (ra !== rb) out.teammateAhead[aheadA ? 'a' : 'b']++
    }
  }
  return out
}

export interface CircuitWin {
  year: number
  race: string
  driver: number
  constructor: string
}

export function circuitWinners(data: HistoryData, circuit: number): CircuitWin[] {
  const r = data.results
  const out: CircuitWin[] = []
  for (let row = 0; row < r.race.length; row++) {
    if (r.pos[row] !== 1) continue
    const race = r.race[row]!
    if (data.index.races.circuit[race] !== circuit) continue
    out.push({
      year: data.index.races.year[race]!,
      race: data.index.races.name[race]!,
      driver: r.driver[row]!,
      constructor: data.index.constructors[r.constructor[row]!]?.name ?? '',
    })
  }
  return out.sort((x, y) => y.year - x.year)
}

export function resolveCircuit(data: HistoryData, query: string): number {
  const q = norm(query)
  const i = data.index.circuits.findIndex(
    (c) => c.id === q.replace(/ /g, '-') || norm(c.name) === q || norm(c.place) === q,
  )
  if (i >= 0) return i
  const loose = data.index.circuits.findIndex(
    (c) =>
      norm(c.name).includes(q) || norm(c.place).includes(q) || (c.country && norm(c.country) === q),
  )
  if (loose >= 0) return loose
  throw new HistoryLookupError(`No circuit matches "${query}".`)
}
