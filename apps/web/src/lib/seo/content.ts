import type { HistoryIndex, HistoryResults, SessionSummary, View } from '@unbox-box/tools'
import { VIEW_SLUG } from '../routes'

/**
 * The visible summary each prerendered page carries in its HTML: a few sentences, a table or
 * two and links to related pages. Search engines index it, and readers see the same thing
 * under the view (src/components/seo-summary.tsx). Plain data, so it is unit-tested.
 */

export interface SeoLink {
  text: string
  href: string
}

/** A table cell: text, or text that links to another page. */
export type SeoCell = string | SeoLink

export interface SeoTable {
  caption: string
  head: string[]
  rows: SeoCell[][]
}

export interface SeoLinkGroup {
  title: string
  links: SeoLink[]
}

export interface SeoContent {
  intro: string[]
  tables: SeoTable[]
  related: SeoLinkGroup[]
}

export const pathOf = (view: View, segments: string[]): string =>
  `/${[VIEW_SLUG[view], ...segments].join('/')}/`

export const racePath = (year: number, round: number): string =>
  pathOf('races', [String(year), String(round)])
export const driverPath = (id: string): string => pathOf('history', ['drivers', id])
export const teamPath = (id: string): string => pathOf('history', ['teams', id])
export const circuitPath = (id: string): string => pathOf('circuits', [id])

export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

export function ordinal(n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

/** Joins names as English prose: "A", "A and B", "A, B and C". */
export const listOf = (items: string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

/** 2025-09-07 -> 7 September 2025 (UTC, so the build machine's zone never shifts it). */
export function longDate(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
}

/** Indexes over the history tables, built once per source: which result rows belong to each
 *  race, driver and team, which races ran at each circuit, and which pages exist. */
export interface HistoryLookup {
  rowsByRace: number[][]
  rowsByDriver: Map<number, number[]>
  rowsByTeam: Map<number, number[]>
  racesByCircuit: Map<number, number[]>
  raceByRound: Map<string, number>
  sessionsByRound: Map<string, SessionSummary[]>
  hasDriverPage: (driver: number) => boolean
  hasTeamPage: (team: number) => boolean
}

export const roundKey = (year: number, round: number): string => `${year}-${round}`

function push<K>(map: Map<K, number[]>, key: K, value: number) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

const lookups = new WeakMap<HistoryResults, HistoryLookup>()

export function historyLookup(
  h: HistoryIndex,
  results: HistoryResults,
  sessions: SessionSummary[],
): HistoryLookup {
  const known = lookups.get(results)
  if (known) return known
  const rowsByRace: number[][] = h.races.year.map(() => [])
  const rowsByDriver = new Map<number, number[]>()
  const rowsByTeam = new Map<number, number[]>()
  results.race.forEach((race, row) => {
    rowsByRace[race]?.push(row)
    push(rowsByDriver, results.driver[row]!, row)
    push(rowsByTeam, results.constructor[row]!, row)
  })
  const racesByCircuit = new Map<number, number[]>()
  const raceByRound = new Map<string, number>()
  h.races.year.forEach((year, i) => {
    push(racesByCircuit, h.races.circuit[i]!, i)
    raceByRound.set(roundKey(year, h.races.round[i]!), i)
  })
  const sessionsByRound = new Map<string, SessionSummary[]>()
  for (const s of sessions) {
    if (s.round == null) continue
    const key = roundKey(s.season, s.round)
    sessionsByRound.set(key, [...(sessionsByRound.get(key) ?? []), s])
  }
  const lookup: HistoryLookup = {
    rowsByRace,
    rowsByDriver,
    rowsByTeam,
    racesByCircuit,
    raceByRound,
    sessionsByRound,
    hasDriverPage: (d) => (h.drivers[d]?.starts ?? 0) > 0,
    hasTeamPage: (t) => (h.constructors[t]?.starts ?? 0) > 0,
  }
  lookups.set(results, lookup)
  return lookup
}

/** Links to the telemetry pages of one race weekend (2023 onwards). */
export function sessionLinks(sessions: SessionSummary[]): SeoLink[] {
  const order = ['Sprint Qualifying', 'Sprint', 'Qualifying', 'Race']
  return [...sessions]
    .sort((a, b) => order.indexOf(a.session) - order.indexOf(b.session))
    .flatMap((s) => [
      { text: `${s.session} lap comparison`, href: pathOf('lap-duel', [s.id]) },
      ...(s.session === 'Race'
        ? [
            { text: 'Tyre strategy and pit stops', href: pathOf('strategy', [s.id]) },
            { text: 'Race replay', href: pathOf('replay', [s.id]) },
          ]
        : []),
    ])
}
