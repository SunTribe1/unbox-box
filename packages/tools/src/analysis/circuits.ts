import type { HistoryData } from '../data/schema'

/** Circuit profiles from F1DB: how often it has hosted, who wins there, how much pole
 *  matters, the lap record and the next visit. */

export interface CircuitProfile {
  races: number
  firstYear: number | null
  lastYear: number | null
  topDrivers: { driver: number; wins: number; podiums: number }[]
  topTeams: { constructor: number; wins: number }[]
  /** Share of races won from pole, and the average grid slot of winners. */
  poleToWin: number | null
  winnerGrid: number | null
  record: { time: number; driver: number; year: number } | null
  olderRecords: { time: number; driver: number; year: number }[]
  next: { year: number; round: number; name: string; date: string } | null
}

export function circuitProfile(
  data: HistoryData,
  circuit: number,
  today = new Date(),
): CircuitProfile {
  const { races } = data.index
  const r = data.results
  const hosted = races.circuit.map((c, race) => (c === circuit ? race : -1)).filter((x) => x >= 0)
  const hostedSet = new Set(hosted)
  const years = hosted.map((race) => races.year[race]!)
  const drivers = new Map<number, { wins: number; podiums: number }>()
  const teams = new Map<number, number>()
  let wins = 0
  let fromPole = 0
  let gridSum = 0
  let gridCount = 0
  for (let row = 0; row < r.race.length; row++) {
    if (!hostedSet.has(r.race[row]!)) continue
    const pos = r.pos[row]!
    if (pos >= 1 && pos <= 3) {
      const d = drivers.get(r.driver[row]!) ?? { wins: 0, podiums: 0 }
      d.podiums++
      if (pos === 1) d.wins++
      drivers.set(r.driver[row]!, d)
    }
    if (pos !== 1) continue
    wins++
    teams.set(r.constructor[row]!, (teams.get(r.constructor[row]!) ?? 0) + 1)
    if (r.grid[row] === 1) fromPole++
    if (r.grid[row]! > 0) {
      gridSum += r.grid[row]!
      gridCount++
    }
  }
  const records = data.index.lapRecords.filter((l) => l.circuit === circuit)
  const current = records.find((l) => l.current) ?? null
  const iso = today.toISOString().slice(0, 10)
  const next =
    data.index.calendar
      .filter((c) => c.circuit === circuit && c.date >= iso)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  return {
    races: hosted.length,
    firstYear: years.length ? Math.min(...years) : null,
    lastYear: years.length ? Math.max(...years) : null,
    topDrivers: [...drivers]
      .sort(([, a], [, b]) => b.wins - a.wins || b.podiums - a.podiums)
      .slice(0, 5)
      .map(([driver, d]) => ({ driver, ...d })),
    topTeams: [...teams]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([constructor, n]) => ({ constructor, wins: n })),
    poleToWin: wins ? fromPole / wins : null,
    winnerGrid: gridCount ? gridSum / gridCount : null,
    record: current && { time: current.time, driver: current.driver, year: current.year },
    olderRecords: records
      .filter((l) => !l.current)
      .map((l) => ({ time: l.time, driver: l.driver, year: l.year })),
    next: next && { year: next.year, round: next.round, name: next.name, date: next.date },
  }
}
