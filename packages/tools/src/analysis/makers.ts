import type { Catalog, EngineSpec } from '../data/archive-schema'
import type { HistoryData } from '../data/schema'

/** Engine and tyre makers: who they supplied, what they built and how it went. */

export type MakerKind = 'engine' | 'tyre'

export interface MakerSeason {
  year: number
  pos: number | null
  starts: number
  wins: number
  podiums: number
  poles: number
  points: number | null
  /** Teams this maker supplied that year. */
  teams: number[]
}

export interface EngineEra {
  /** "1.6 V6 turbo hybrid" */
  label: string
  from: number
  to: number
  names: string[]
}

export interface MakerProfile {
  kind: MakerKind
  maker: number
  seasons: MakerSeason[]
  /** Teams supplied, most seasons first. */
  teams: { constructor: number; from: number; to: number; seasons: number }[]
  /** Engine specs by era (engines only). */
  eras: EngineEra[]
  /** Constructors' titles won with this maker's engines (engines only). */
  titleYears: number[]
}

const ASPIRATION: Record<string, string> = {
  NATURALLY_ASPIRATED: '',
  TURBOCHARGED: ' turbo',
  TURBOCHARGED_HYBRID: ' turbo hybrid',
  SUPERCHARGED: ' supercharged',
}

/** "1.6 V6 turbo hybrid", "3.0 V10", "1.5 F12". */
export function engineLabel(e: EngineSpec): string {
  const size = e.capacity != null ? `${e.capacity.toFixed(1)} ` : ''
  return `${size}${e.layout ?? ''}${ASPIRATION[e.aspiration ?? ''] ?? ''}`.trim() || e.name
}

export function makerProfile(
  data: HistoryData,
  catalog: Catalog,
  kind: MakerKind,
  maker: number,
): MakerProfile {
  const seasonsTable = kind === 'engine' ? catalog.engineSeasons : catalog.tyreSeasons
  const cars = catalog.teamSeasons.filter((t) =>
    kind === 'engine' ? t.engineMaker === maker : t.tyres.includes(maker),
  )
  const teamsByYear = new Map<number, number[]>()
  for (const car of cars)
    teamsByYear.set(car.year, [...(teamsByYear.get(car.year) ?? []), car.constructor])

  const seasons = seasonsTable
    .filter((s) => s.maker === maker && s.starts > 0)
    .map((s) => ({
      year: s.year,
      pos: s.pos,
      starts: s.starts,
      wins: s.wins,
      podiums: s.podiums,
      poles: s.poles,
      points: s.points,
      teams: teamsByYear.get(s.year) ?? [],
    }))
    .sort((a, b) => a.year - b.year)

  const span = new Map<number, { from: number; to: number; years: Set<number> }>()
  for (const car of cars) {
    const t = span.get(car.constructor) ?? { from: car.year, to: car.year, years: new Set() }
    span.set(car.constructor, {
      from: Math.min(t.from, car.year),
      to: Math.max(t.to, car.year),
      years: t.years.add(car.year),
    })
  }
  const teams = [...span]
    .map(([constructor, t]) => ({ constructor, from: t.from, to: t.to, seasons: t.years.size }))
    .sort((a, b) => b.seasons - a.seasons || a.from - b.from)

  const eras: EngineEra[] = []
  if (kind === 'engine') {
    const byYear = [...new Set(cars.map((c) => c.year))].sort((a, b) => a - b)
    for (const year of byYear) {
      const specs = cars.filter((c) => c.year === year).flatMap((c) => c.engines)
      for (const spec of specs) {
        const label = engineLabel(spec)
        const era = eras.find((e) => e.label === label && e.to >= year - 1)
        if (era) {
          era.to = year
          if (!era.names.includes(spec.name)) era.names.push(spec.name)
        } else eras.push({ label, from: year, to: year, names: [spec.name] })
      }
    }
  }

  const champions = new Map(data.index.constructorChampions.map((c) => [c.year, c.constructor]))
  const titleYears =
    kind === 'engine'
      ? cars.filter((c) => champions.get(c.year) === c.constructor).map((c) => c.year)
      : []
  return { kind, maker, seasons, teams, eras, titleYears: [...new Set(titleYears)].sort() }
}

/** Wins per tyre maker per season: the tyre wars at a glance. */
export function tyreWars(catalog: Catalog): { year: number; wins: Map<number, number> }[] {
  const byYear = new Map<number, Map<number, number>>()
  for (const s of catalog.tyreSeasons) {
    if (!s.starts) continue
    const m = byYear.get(s.year) ?? new Map<number, number>()
    m.set(s.maker, s.wins)
    byYear.set(s.year, m)
  }
  return [...byYear].map(([year, wins]) => ({ year, wins })).sort((a, b) => a.year - b.year)
}

/** The engine formula most of the grid ran each year ("3.0 V10" in 2000). */
export function engineFormulaByYear(
  catalog: Catalog,
): { year: number; label: string; share: number }[] {
  const byYear = new Map<number, Map<string, number>>()
  for (const car of catalog.teamSeasons) {
    const m = byYear.get(car.year) ?? new Map<string, number>()
    for (const e of car.engines) m.set(engineLabel(e), (m.get(engineLabel(e)) ?? 0) + 1)
    byYear.set(car.year, m)
  }
  return [...byYear]
    .map(([year, m]) => {
      const total = [...m.values()].reduce((a, b) => a + b, 0)
      const [label, n] = [...m].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
      return { year, label, share: total ? n / total : 0 }
    })
    .sort((a, b) => a.year - b.year)
}
