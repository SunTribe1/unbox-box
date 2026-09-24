import type { Catalog } from '../data/archive-schema'
import type { HistoryData } from '../data/schema'

/** Nations: drivers, teams and circuits by country, and driver families. Countries are
 *  ISO 3166 alpha-2 codes, as the pipeline writes them. */

export interface NationSummary {
  code: string
  name: string
  continent: string | null
  drivers: number
  winners: number
  wins: number
  titles: number
  teams: number
  circuits: number
  /** Grands Prix hosted. */
  races: number
}

export function nationSummaries(data: HistoryData, catalog: Catalog): NationSummary[] {
  const { drivers, constructors, circuits, champions, races } = data.index
  const rows = new Map<string, NationSummary>()
  const row = (code: string | null | undefined) => {
    if (!code) return null
    if (!rows.has(code)) {
      const c = catalog.countries.find((x) => x.code === code)
      rows.set(code, {
        code,
        name: c?.name ?? code,
        continent: c?.continent ?? null,
        drivers: 0,
        winners: 0,
        wins: 0,
        titles: 0,
        teams: 0,
        circuits: 0,
        races: 0,
      })
    }
    return rows.get(code)!
  }
  for (const d of drivers) {
    const r = row(d.code)
    if (!r || !d.starts) continue
    r.drivers++
    r.wins += d.wins
    if (d.wins) r.winners++
  }
  for (const c of champions) {
    const r = row(drivers[c.driver]?.code)
    if (r) r.titles++
  }
  for (const t of constructors) {
    const r = row(t.code)
    if (r && t.starts) r.teams++
  }
  const hosted = new Map<number, number>()
  for (const c of races.circuit) hosted.set(c, (hosted.get(c) ?? 0) + 1)
  circuits.forEach((c, i) => {
    const r = row(c.code)
    if (r && hosted.get(i)) {
      r.circuits++
      r.races += hosted.get(i)!
    }
  })
  return [...rows.values()]
    .filter((r) => r.drivers || r.races || r.teams)
    .sort((a, b) => b.wins - a.wins || b.drivers - a.drivers || a.name.localeCompare(b.name))
}

export interface NationProfile {
  summary: NationSummary
  drivers: number[]
  teams: number[]
  circuits: number[]
  champions: { year: number; driver: number }[]
}

export function nationProfile(
  data: HistoryData,
  catalog: Catalog,
  code: string,
): NationProfile | null {
  const summary = nationSummaries(data, catalog).find((n) => n.code === code)
  if (!summary) return null
  const { drivers, constructors, circuits, champions } = data.index
  const idx = <T>(items: T[], keep: (x: T) => boolean) =>
    items.flatMap((x, i) => (keep(x) ? [i] : []))
  return {
    summary,
    drivers: idx(drivers, (d) => d.code === code && d.starts > 0).sort(
      (a, b) =>
        drivers[b]!.titles - drivers[a]!.titles ||
        drivers[b]!.wins - drivers[a]!.wins ||
        drivers[b]!.starts - drivers[a]!.starts,
    ),
    teams: idx(constructors, (t) => t.code === code && (t.starts ?? 0) > 0).sort(
      (a, b) => (constructors[b]!.wins ?? 0) - (constructors[a]!.wins ?? 0),
    ),
    circuits: idx(circuits, (c) => c.code === code),
    champions: champions.filter((c) => drivers[c.driver]?.code === code),
  }
}

const RELATION: Record<string, [string, string, string]> = {
  // type: [male, female, unknown]
  PARENT: ['Father', 'Mother', 'Parent'],
  CHILD: ['Son', 'Daughter', 'Child'],
  SIBLING: ['Brother', 'Sister', 'Sibling'],
  HALF_SIBLING: ['Half-brother', 'Half-sister', 'Half-sibling'],
  GRANDPARENT: ['Grandfather', 'Grandmother', 'Grandparent'],
  GRANDCHILD: ['Grandson', 'Granddaughter', 'Grandchild'],
  PARENTS_SIBLING: ['Uncle', 'Aunt', 'Uncle or aunt'],
  SIBLINGS_CHILD: ['Nephew', 'Niece', 'Nephew or niece'],
  PARENTS_SIBLINGS_CHILD: ['Cousin', 'Cousin', 'Cousin'],
  GRANDPARENTS_SIBLING: ['Great-uncle', 'Great-aunt', 'Great-uncle or aunt'],
  SIBLINGS_GRANDCHILD: ['Great-nephew', 'Great-niece', 'Great-nephew or niece'],
  CHILD_IN_LAW: ['Son-in-law', 'Daughter-in-law', 'Child-in-law'],
  PARENT_IN_LAW: ['Father-in-law', 'Mother-in-law', 'Parent-in-law'],
  SIBLING_IN_LAW: ['Brother-in-law', 'Sister-in-law', 'Sibling-in-law'],
  SIBLINGS_CHILD_IN_LAW: ['Nephew-in-law', 'Niece-in-law', 'Nephew- or niece-in-law'],
}

/** A driver's relatives who also raced in F1: "Son: Damon Hill". */
export function familyOf(
  data: HistoryData,
  catalog: Catalog,
  driver: number,
): { driver: number; relation: string }[] {
  return catalog.family
    .filter((f) => f.relative === driver)
    .map((f) => {
      const names = RELATION[f.type] ?? [f.type, f.type, f.type]
      const g = data.index.drivers[f.driver]?.gender
      return {
        driver: f.driver,
        relation: g === 'MALE' ? names[0] : g === 'FEMALE' ? names[1] : names[2],
      }
    })
}

/** Emoji-free flag lookup key: lower-case alpha-2 code, or null. */
export const flagCode = (code: string | null | undefined): string | null =>
  code && /^[A-Za-z]{2}$/.test(code) ? code.toLowerCase() : null
