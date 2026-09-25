import type { HistoryData, HistoryStandings } from '../data/schema'
import { stripAccents } from '../util/text'
import { careerBySeason, type Season } from './history'

/** Driver and team profiles, championship progressions and grid-to-flag gains, all derived
 *  from F1DB race results (see analysis/history.ts for the data layout). */

export const isClassified = (pos: number) => pos > 0

const plain = (s: string) =>
  stripAccents(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Finds a constructor by name, full name or id ("Ferrari", "Scuderia Ferrari", "red bull").
 *  Ties go to the team with more wins. Returns -1 when nothing matches. */
export function resolveTeam(data: HistoryData, query: string): number {
  const q = plain(query)
    .replace(/\b(team|racing|f1|formula one|scuderia)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!q) return -1
  let best = -1
  let bestScore = 0
  data.index.constructors.forEach((c, i) => {
    const name = plain(c.name)
    const full = plain(c.fullName ?? c.name)
    let score = 0
    if (name === q || plain(c.id.replace(/-/g, ' ')) === q) score = 100
    else if (full.includes(q) || name.includes(q)) score = 50
    else if (q.includes(name) && name.length >= 4) score = 40
    if (!score) return
    score += Math.min(9.9, (c.wins ?? 0) / 20 + (c.starts ?? 0) / 500)
    if (score > bestScore) {
      best = i
      bestScore = score
    }
  })
  return best
}

/** The team a driver is best known for: most wins with, then most starts for. */
export function signatureTeam(data: HistoryData, driver: number): number | null {
  const r = data.results
  const tally = new Map<number, { wins: number; starts: number }>()
  for (let row = 0; row < r.race.length; row++) {
    if (r.driver[row] !== driver) continue
    const t = tally.get(r.constructor[row]!) ?? { wins: 0, starts: 0 }
    t.starts++
    if (r.pos[row] === 1) t.wins++
    tally.set(r.constructor[row]!, t)
  }
  return [...tally].sort(([, a], [, b]) => b.wins - a.wins || b.starts - a.starts)[0]?.[0] ?? null
}

export interface TeamStint {
  constructor: number
  name: string
  from: number
  to: number
  starts: number
  wins: number
  podiums: number
}

export interface ProfileSeason extends Season {
  teams: string[]
  /** Final championship position, when standings are loaded. */
  position: number | null
}

export interface DriverProfile {
  seasons: ProfileSeason[]
  teams: TeamStint[]
  rates: { win: number; podium: number; pole: number; finish: number }
  /** Average places gained from grid to flag in classified finishes from a grid slot. */
  averageGain: number | null
  bestComeback: { race: number; grid: number; pos: number } | null
  bestCircuits: { circuit: number; name: string; wins: number; podiums: number; starts: number }[]
  teammates: { driver: number; races: number; ahead: number; behind: number }[]
  firstWin: number | null
  lastWin: number | null
}

/** Consecutive seasons with one constructor become one stint (a mid-season move starts a new
 *  one), so a career reads like a CV. */
function stintsOf(data: HistoryData, rows: number[]): TeamStint[] {
  const r = data.results
  const years = data.index.races.year
  const stints: TeamStint[] = []
  for (const row of rows) {
    const c = r.constructor[row]!
    const year = years[r.race[row]!]!
    const last = stints.at(-1)
    const stint =
      last && last.constructor === c && year - last.to <= 1
        ? last
        : stints[
            stints.push({
              constructor: c,
              name: data.index.constructors[c]?.name ?? 'Unknown',
              from: year,
              to: year,
              starts: 0,
              wins: 0,
              podiums: 0,
            }) - 1
          ]!
    stint.to = year
    stint.starts++
    if (r.pos[row] === 1) stint.wins++
    if (r.pos[row]! >= 1 && r.pos[row]! <= 3) stint.podiums++
  }
  return stints
}

/** Final position in each season's championship, from the last round's standings. */
export function finalPositions(
  data: HistoryData,
  standings: HistoryStandings['drivers' | 'constructors'],
  id: number,
): Map<number, number> {
  const years = data.index.races.year
  const lastRound = new Map<number, number>()
  years.forEach((y, race) => lastRound.set(y, Math.max(lastRound.get(y) ?? -1, race)))
  const out = new Map<number, number>()
  for (let i = 0; i < standings.race.length; i++) {
    if (standings.id[i] !== id) continue
    const race = standings.race[i]!
    if (lastRound.get(years[race]!) === race) out.set(years[race]!, standings.pos[i]!)
  }
  return out
}

export function driverProfile(
  data: HistoryData,
  driver: number,
  standings?: HistoryStandings,
): DriverProfile {
  const r = data.results
  const rows: number[] = []
  for (let row = 0; row < r.race.length; row++) if (r.driver[row] === driver) rows.push(row)
  rows.sort((a, b) => r.race[a]! - r.race[b]!)

  const teams = stintsOf(data, rows)
  const positions = standings ? finalPositions(data, standings.drivers, driver) : new Map()
  const seasons: ProfileSeason[] = careerBySeason(data, driver).map((s) => ({
    ...s,
    teams: teams.filter((t) => s.year >= t.from && s.year <= t.to).map((t) => t.name),
    position: positions.get(s.year) ?? null,
  }))

  const starts = rows.length || 1
  const count = (test: (row: number) => boolean) => rows.filter(test).length
  const gains = rows.filter((row) => r.grid[row]! > 0 && isClassified(r.pos[row]!))
  let bestComeback: DriverProfile['bestComeback'] = null
  for (const row of gains) {
    const gain = r.grid[row]! - r.pos[row]!
    if (gain > 0 && (!bestComeback || gain > bestComeback.grid - bestComeback.pos)) {
      bestComeback = { race: r.race[row]!, grid: r.grid[row]!, pos: r.pos[row]! }
    }
  }

  const circuits = new Map<number, { wins: number; podiums: number; starts: number }>()
  for (const row of rows) {
    const c = data.index.races.circuit[r.race[row]!]!
    const s = circuits.get(c) ?? { wins: 0, podiums: 0, starts: 0 }
    s.starts++
    if (r.pos[row] === 1) s.wins++
    if (r.pos[row]! >= 1 && r.pos[row]! <= 3) s.podiums++
    circuits.set(c, s)
  }
  const bestCircuits = [...circuits]
    .filter(([, s]) => s.podiums > 0)
    .sort(([, a], [, b]) => b.wins - a.wins || b.podiums - a.podiums || a.starts - b.starts)
    .slice(0, 5)
    .map(([circuit, s]) => ({ circuit, name: data.index.circuits[circuit]?.name ?? '', ...s }))

  const wins = rows.filter((row) => r.pos[row] === 1)
  return {
    seasons,
    teams,
    rates: {
      win: count((row) => r.pos[row] === 1) / starts,
      podium: count((row) => r.pos[row]! >= 1 && r.pos[row]! <= 3) / starts,
      pole: count((row) => r.pole[row] === 1) / starts,
      finish: count((row) => isClassified(r.pos[row]!)) / starts,
    },
    averageGain: gains.length
      ? gains.reduce((sum, row) => sum + (r.grid[row]! - r.pos[row]!), 0) / gains.length
      : null,
    bestComeback,
    bestCircuits,
    teammates: teammatesOf(data, driver, rows),
    firstWin: wins.length ? r.race[wins[0]!]! : null,
    lastWin: wins.length ? r.race[wins.at(-1)!]! : null,
  }
}

/** Everyone who shared a car with the driver, most races together first. "Ahead" means
 *  finished ahead; a classified finish beats a retirement, two retirements count for no one. */
function teammatesOf(data: HistoryData, driver: number, rows: number[]) {
  const r = data.results
  const byRace = new Map<number, number[]>()
  for (let row = 0; row < r.race.length; row++) {
    const list = byRace.get(r.race[row]!)
    if (list) list.push(row)
    else byRace.set(r.race[row]!, [row])
  }
  const mates = new Map<number, { races: number; ahead: number; behind: number }>()
  for (const row of rows) {
    for (const other of byRace.get(r.race[row]!) ?? []) {
      if (other === row || r.constructor[other] !== r.constructor[row]) continue
      const m = mates.get(r.driver[other]!) ?? { races: 0, ahead: 0, behind: 0 }
      m.races++
      const mine = r.pos[row]! || Infinity
      const theirs = r.pos[other]! || Infinity
      if (mine < theirs) m.ahead++
      else if (theirs < mine) m.behind++
      mates.set(r.driver[other]!, m)
    }
  }
  return [...mates]
    .sort(([, a], [, b]) => b.races - a.races)
    .slice(0, 6)
    .map(([d, m]) => ({ driver: d, ...m }))
}

/** The constructor a driver scored most points with in a season (their "car" that year). */
export function mainTeam(data: HistoryData, driver: number, year: number): number | null {
  const r = data.results
  const points = new Map<number, number>()
  for (let row = 0; row < r.race.length; row++) {
    if (r.driver[row] !== driver || data.index.races.year[r.race[row]!] !== year) continue
    points.set(r.constructor[row]!, (points.get(r.constructor[row]!) ?? 0) + r.points[row]! + 0.001)
  }
  return [...points].sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
}
