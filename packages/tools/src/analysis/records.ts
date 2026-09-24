import type { HistoryData } from '../data/schema'
import { ranking, type Filters } from './history'

/**
 * The record book: leaderboards for drivers and teams (engine and tyre makers live on their
 * own pages). Boards
 * built from race results honour the era filter; boards that come from F1DB's career totals
 * (Driver of the Day, sprint wins...) are all-time only and say so.
 */

export type RecordScope = 'drivers' | 'teams'
export const RECORD_SCOPES: readonly RecordScope[] = ['drivers', 'teams']

/** How a board's value reads: a count, a share (0–1), an age in days, or a time in ms. */
export type RecordUnit = 'count' | 'points' | 'share' | 'age' | 'ms'

export interface RecordRow {
  /** Index into drivers or constructors, per the board's scope. */
  subject: number
  value: number
  /** The race it happened at, for one-off records (youngest winner...). */
  year?: number
  round?: number
  /** A second driver: the runner-up in a winning margin. */
  other?: number
  /** Supporting figure, e.g. "31 wins from 94 starts". */
  detail?: string
}

export interface RecordBoard {
  id: string
  scope: RecordScope
  label: string
  unit: RecordUnit
  /** True when the era filter can't apply (career totals). */
  allTime?: boolean
  /** Lower is better (youngest, closest). */
  ascending?: boolean
  rows: RecordRow[]
}

const LIMIT = 20
const DAY = 86_400_000

/** Days between two ISO dates. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY)
}

/** "23y 214d" style age from a day count. */
export function formatAge(days: number): string {
  const years = Math.floor(days / 365.2425)
  const rest = Math.round(days - years * 365.2425)
  return `${years}y ${rest}d`
}

const inEra = (year: number, f: Filters) =>
  (f.from == null || year >= f.from) && (f.to == null || year <= f.to)

const sortRows = (rows: RecordRow[], ascending = false) =>
  rows
    .filter((r) => Number.isFinite(r.value))
    .sort((a, b) => (ascending ? a.value - b.value : b.value - a.value))
    .slice(0, LIMIT)

/** Wins, podiums or poles per start, for drivers with at least `min` starts in the era. */
function rateBoard(data: HistoryData, f: Filters, what: 'wins' | 'podiums' | 'poles', min = 25) {
  const r = data.results
  const { year } = data.index.races
  const starts = new Map<number, number>()
  const hits = new Map<number, number>()
  for (let row = 0; row < r.race.length; row++) {
    if (!inEra(year[r.race[row]!]!, f)) continue
    const d = r.driver[row]!
    starts.set(d, (starts.get(d) ?? 0) + 1)
    const pos = r.pos[row]!
    const hit =
      what === 'wins' ? pos === 1 : what === 'podiums' ? pos >= 1 && pos <= 3 : !!r.pole[row]
    if (hit) hits.set(d, (hits.get(d) ?? 0) + 1)
  }
  return sortRows(
    [...starts]
      .filter(([, s]) => s >= min)
      .map(([d, s]) => ({
        subject: d,
        value: (hits.get(d) ?? 0) / s,
        detail: `${hits.get(d) ?? 0} from ${s} starts`,
      })),
  )
}

/** Youngest or oldest driver to win, take pole or start, at the moment they did it. */
function ageBoard(
  data: HistoryData,
  f: Filters,
  what: 'win' | 'pole' | 'start',
  oldest: boolean,
): RecordRow[] {
  const r = data.results
  const { year, round, date } = data.index.races
  const best = new Map<number, RecordRow>()
  for (let row = 0; row < r.race.length; row++) {
    const race = r.race[row]!
    if (!inEra(year[race]!, f)) continue
    const hit = what === 'win' ? r.pos[row] === 1 : what === 'pole' ? !!r.pole[row] : true
    if (!hit) continue
    const d = r.driver[row]!
    const dob = data.index.drivers[d]?.dob
    if (!dob) continue
    const age = daysBetween(dob, date[race]!)
    const prev = best.get(d)
    // Each driver once: their youngest (or oldest) moment.
    if (!prev || (oldest ? age > prev.value : age < prev.value)) {
      best.set(d, { subject: d, value: age, year: year[race], round: round[race] })
    }
  }
  return sortRows([...best.values()], !oldest)
}

/** Most wins (or poles) in one season, by driver or team. */
function bestSeason(data: HistoryData, f: Filters, by: 'driver' | 'constructor'): RecordRow[] {
  const r = data.results
  const { year } = data.index.races
  const tally = new Map<string, RecordRow>()
  for (let row = 0; row < r.race.length; row++) {
    if (r.pos[row] !== 1) continue
    const y = year[r.race[row]!]!
    if (!inEra(y, f)) continue
    const subject = by === 'driver' ? r.driver[row]! : r.constructor[row]!
    const key = `${subject}:${y}`
    const t = tally.get(key) ?? { subject, value: 0, year: y }
    tally.set(key, { ...t, value: t.value + 1 })
  }
  return sortRows([...tally.values()])
}

/** Longest run of consecutive wins. A race the driver didn't start doesn't break it. */
function winStreaks(data: HistoryData, f: Filters): RecordRow[] {
  const r = data.results
  const { year, round } = data.index.races
  const byRace = new Map<number, { winner: number | null; starters: number[] }>()
  for (let row = 0; row < r.race.length; row++) {
    const race = r.race[row]!
    const entry = byRace.get(race) ?? { winner: null, starters: [] }
    entry.starters.push(r.driver[row]!)
    if (r.pos[row] === 1) entry.winner = r.driver[row]!
    byRace.set(race, entry)
  }
  const current = new Map<number, { length: number; year: number; round: number }>()
  const best = new Map<number, RecordRow>()
  for (const race of [...byRace.keys()].sort((a, b) => a - b)) {
    if (!inEra(year[race]!, f)) continue
    const { winner, starters } = byRace.get(race)!
    for (const d of starters) {
      if (d === winner) {
        const run = current.get(d) ?? { length: 0, year: year[race]!, round: round[race]! }
        const next = { ...run, length: run.length + 1 }
        current.set(d, next)
        if ((best.get(d)?.value ?? 0) < next.length) {
          best.set(d, { subject: d, value: next.length, year: next.year, round: next.round })
        }
      } else current.delete(d)
    }
  }
  return sortRows([...best.values()])
}

function teamTotals(data: HistoryData, f: Filters, what: 'wins' | 'poles' | 'podiums' | 'oneTwos') {
  const r = data.results
  const { year } = data.index.races
  const tally = new Map<number, number>()
  const byRace = new Map<number, Map<number, number>>()
  for (let row = 0; row < r.race.length; row++) {
    const race = r.race[row]!
    if (!inEra(year[race]!, f)) continue
    const c = r.constructor[row]!
    if (c < 0) continue
    const pos = r.pos[row]!
    if (what === 'oneTwos') {
      if (pos === 1 || pos === 2) {
        const m = byRace.get(race) ?? new Map<number, number>()
        m.set(c, (m.get(c) ?? 0) + 1)
        byRace.set(race, m)
      }
      continue
    }
    const hit =
      what === 'wins' ? pos === 1 : what === 'podiums' ? pos >= 1 && pos <= 3 : !!r.pole[row]
    if (hit) tally.set(c, (tally.get(c) ?? 0) + 1)
  }
  for (const m of byRace.values()) {
    for (const [c, n] of m) if (n === 2) tally.set(c, (tally.get(c) ?? 0) + 1)
  }
  return sortRows([...tally].map(([subject, value]) => ({ subject, value })))
}

const fromRanking = (rows: { driver: number; value: number }[]) =>
  rows.map((x) => ({ subject: x.driver, value: x.value }))

const careerTotal = <T>(items: T[], value: (x: T) => number | undefined) =>
  sortRows(
    items.map((x, subject) => ({ subject, value: value(x) ?? 0 })).filter((x) => x.value > 0),
  )

/** Every board for a scope. */
export function recordBoards(
  data: HistoryData,
  scope: RecordScope,
  filters: Filters = {},
): RecordBoard[] {
  const f = filters
  const d = data.index.drivers
  const board = (b: Omit<RecordBoard, 'scope'>): RecordBoard => ({ ...b, scope })
  if (scope === 'drivers') {
    return [
      board({
        id: 'wins',
        label: 'Wins',
        unit: 'count',
        rows: fromRanking(ranking(data, 'wins', f, LIMIT)),
      }),
      board({
        id: 'titles',
        label: 'Championships',
        unit: 'count',
        rows: fromRanking(ranking(data, 'titles', f, LIMIT)),
      }),
      board({
        id: 'poles',
        label: 'Pole positions',
        unit: 'count',
        rows: fromRanking(ranking(data, 'poles', f, LIMIT)),
      }),
      board({
        id: 'podiums',
        label: 'Podiums',
        unit: 'count',
        rows: fromRanking(ranking(data, 'podiums', f, LIMIT)),
      }),
      board({
        id: 'fastest-laps',
        label: 'Fastest laps',
        unit: 'count',
        rows: fromRanking(ranking(data, 'fastestLaps', f, LIMIT)),
      }),
      board({
        id: 'points',
        label: 'Points',
        unit: 'points',
        rows: fromRanking(ranking(data, 'points', f, LIMIT)),
      }),
      board({
        id: 'starts',
        label: 'Starts',
        unit: 'count',
        rows: fromRanking(ranking(data, 'starts', f, LIMIT)),
      }),
      board({
        id: 'win-rate',
        label: 'Win rate (25+ starts)',
        unit: 'share',
        rows: rateBoard(data, f, 'wins'),
      }),
      board({
        id: 'pole-rate',
        label: 'Pole rate (25+ starts)',
        unit: 'share',
        rows: rateBoard(data, f, 'poles'),
      }),
      board({
        id: 'podium-rate',
        label: 'Podium rate (25+ starts)',
        unit: 'share',
        rows: rateBoard(data, f, 'podiums'),
      }),
      board({
        id: 'season-wins',
        label: 'Most wins in a season',
        unit: 'count',
        rows: bestSeason(data, f, 'driver'),
      }),
      board({
        id: 'win-streak',
        label: 'Consecutive wins',
        unit: 'count',
        rows: winStreaks(data, f),
      }),
      board({
        id: 'youngest-winner',
        label: 'Youngest winners',
        unit: 'age',
        ascending: true,
        rows: ageBoard(data, f, 'win', false),
      }),
      board({
        id: 'oldest-winner',
        label: 'Oldest winners',
        unit: 'age',
        rows: ageBoard(data, f, 'win', true),
      }),
      board({
        id: 'youngest-pole',
        label: 'Youngest pole-sitters',
        unit: 'age',
        ascending: true,
        rows: ageBoard(data, f, 'pole', false),
      }),
      board({
        id: 'youngest-starter',
        label: 'Youngest starters',
        unit: 'age',
        ascending: true,
        rows: ageBoard(data, f, 'start', false),
      }),
      board({
        id: 'grand-slams',
        label: 'Grand slams',
        unit: 'count',
        allTime: true,
        rows: careerTotal(d, (x) => x.grandSlams),
      }),
      board({
        id: 'dotd',
        label: 'Driver of the Day',
        unit: 'count',
        allTime: true,
        rows: careerTotal(d, (x) => x.dotd),
      }),
      board({
        id: 'sprint-wins',
        label: 'Sprint wins',
        unit: 'count',
        allTime: true,
        rows: careerTotal(d, (x) => x.sprintWins),
      }),
      board({
        id: 'laps',
        label: 'Laps raced',
        unit: 'count',
        allTime: true,
        rows: careerTotal(d, (x) => x.laps),
      }),
    ]
  }
  if (scope === 'teams') {
    const c = data.index.constructors
    const titles = new Map<number, number>()
    for (const t of data.index.constructorChampions) {
      if (inEra(t.year, f)) titles.set(t.constructor, (titles.get(t.constructor) ?? 0) + 1)
    }
    return [
      board({ id: 'wins', label: 'Wins', unit: 'count', rows: teamTotals(data, f, 'wins') }),
      board({
        id: 'titles',
        label: 'Constructors’ titles',
        unit: 'count',
        rows: sortRows([...titles].map(([subject, value]) => ({ subject, value }))),
      }),
      board({
        id: 'poles',
        label: 'Pole positions',
        unit: 'count',
        rows: teamTotals(data, f, 'poles'),
      }),
      board({
        id: 'podiums',
        label: 'Podiums',
        unit: 'count',
        rows: teamTotals(data, f, 'podiums'),
      }),
      board({
        id: 'one-twos',
        label: 'One-two finishes',
        unit: 'count',
        rows: teamTotals(data, f, 'oneTwos'),
      }),
      board({
        id: 'season-wins',
        label: 'Most wins in a season',
        unit: 'count',
        rows: bestSeason(data, f, 'constructor'),
      }),
      board({
        id: 'starts',
        label: 'Race starts',
        unit: 'count',
        allTime: true,
        rows: careerTotal(c, (x) => x.starts),
      }),
      board({
        id: 'points',
        label: 'Points',
        unit: 'points',
        allTime: true,
        rows: careerTotal(c, (x) => x.points),
      }),
      board({
        id: 'sprint-wins',
        label: 'Sprint wins',
        unit: 'count',
        allTime: true,
        rows: careerTotal(c, (x) => x.sprintWins),
      }),
    ]
  }
  return []
}
