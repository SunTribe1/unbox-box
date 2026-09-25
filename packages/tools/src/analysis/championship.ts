import type { HistoryData, HistoryStandings } from '../data/schema'
import { isClassified } from './profiles'
/** Season championships round by round, and grid-to-flag gains for one race. */

export interface Progression {
  season: number
  rounds: { race: number; round: number; name: string }[]
  /** Final order. `points[i]` is the total after round i (null before a first appearance). */
  rows: { id: number; name: string; position: number; points: (number | null)[] }[]
}

/** How a championship unfolded, round by round, from the official standings. */
export function championshipProgression(
  data: HistoryData,
  standings: HistoryStandings,
  season: number,
  kind: 'drivers' | 'constructors',
): Progression {
  const races = data.index.races
  const rounds = races.year
    .map((year, race) => ({ year, race }))
    .filter((x) => x.year === season)
    .map(({ race }) => ({ race, round: races.round[race]!, name: races.name[race]! }))
    .sort((a, b) => a.round - b.round)
  const column = new Map(rounds.map((r, i) => [r.race, i]))
  const table = standings[kind]
  const rows = new Map<number, { points: (number | null)[]; position: number }>()
  for (let i = 0; i < table.race.length; i++) {
    const col = column.get(table.race[i]!)
    if (col == null) continue
    const id = table.id[i]!
    const row = rows.get(id) ?? { points: rounds.map(() => null), position: 0 }
    row.points[col] = table.points[i]!
    if (col === rounds.length - 1 || row.position === 0) row.position = table.pos[i]!
    rows.set(id, row)
  }
  const name = (id: number) =>
    kind === 'drivers'
      ? (data.index.drivers[id]?.name ?? '')
      : (data.index.constructors[id]?.name ?? '')
  return {
    season,
    rounds,
    rows: [...rows]
      .map(([id, row]) => ({ id, name: name(id), ...row }))
      .sort((a, b) => (a.position || 99) - (b.position || 99)),
  }
}

export interface GridGain {
  driver: number
  constructor: number
  grid: number
  pos: number
  status: string
  /** Places gained (positive) or lost; null when the driver was not classified. */
  gained: number | null
}

/** Grid to flag for one race, biggest gains first. A 0 grid slot means a pit-lane start,
 *  counted from the back of the field. */
export function gridToFlag(data: HistoryData, race: number): GridGain[] {
  const r = data.results
  const rows: number[] = []
  for (let row = 0; row < r.race.length; row++) if (r.race[row] === race) rows.push(row)
  const back = rows.length
  return rows
    .map((row) => {
      const grid = r.grid[row]! || back
      const pos = r.pos[row]!
      return {
        driver: r.driver[row]!,
        constructor: r.constructor[row]!,
        grid,
        pos,
        status: r.status[row]!,
        gained: isClassified(pos) ? grid - pos : null,
      }
    })
    .sort((a, b) => (b.gained ?? -99) - (a.gained ?? -99))
}
