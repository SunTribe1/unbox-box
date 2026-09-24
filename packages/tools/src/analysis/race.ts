import type { Replay, SessionMeta, Telemetry } from '../data/schema'
import { progressAt } from './replay'

/** Session-level views of laps and telemetry that the pipeline already ships: running order
 *  lap by lap, ideal laps, speed traps, deleted laps, pedal phases and the live state of a
 *  car during a replay. */

export interface PositionHistory {
  /** 0 is the start (grid order), then the end of each lap. */
  laps: number[]
  /** Position per entry of `laps`; null once a car has stopped (or before it starts). */
  rows: Record<string, (number | null)[]>
}

export function positionHistory(replay: Replay): PositionHistory {
  const drivers = Object.keys(replay.progress)
  const laps = Array.from({ length: replay.totalLaps + 1 }, (_, i) => i)
  const rows: PositionHistory['rows'] = Object.fromEntries(
    drivers.map((d) => [d, laps.map(() => null)]),
  )
  // Grid: cars behind the line have slightly negative progress, so order by it at t = 0.
  const grid = drivers
    .map((d) => ({ d, p: progressAt(replay, d, 0) }))
    .filter((c) => (replay.progress[c.d]?.length ?? 0) > 0)
    .sort((a, b) => b.p - a.p)
  grid.forEach((c, i) => (rows[c.d]![0] = i + 1))
  // A lap ends when the next one starts; a car's last lap ends at its finish time.
  const finish = new Map(replay.classification.map((c) => [c.driver, c]))
  const lapEnd = (d: string, lap: number) => {
    const next = replay.lapStarts[d]?.[lap]
    if (next != null) return next
    const c = finish.get(d)
    return c && c.laps === lap && c.time != null ? c.time : null
  }
  for (const lap of laps.slice(1)) {
    const crossed = drivers
      .map((d) => ({ d, t: lapEnd(d, lap) }))
      .filter((c): c is { d: string; t: number } => c.t != null)
      .sort((a, b) => a.t - b.t)
    crossed.forEach((c, i) => (rows[c.d]![lap] = i + 1))
  }
  return { laps, rows }
}

export interface IdealLap {
  best: { lap: number; time: number } | null
  sectors: ({ lap: number; time: number } | null)[]
  /** Sum of the best three sectors, when all three exist. */
  ideal: number | null
}

/** The lap a driver could have done by stitching their best sectors together. */
export function idealLap(meta: SessionMeta, driver: string): IdealLap {
  const laps = (meta.laps[driver] ?? []).filter((l) => !l.deleted)
  const bestOf = (pick: (l: (typeof laps)[number]) => number | null) =>
    laps.reduce<{ lap: number; time: number } | null>((best, l) => {
      const t = pick(l)
      return t != null && (!best || t < best.time) ? { lap: l.lap, time: t } : best
    }, null)
  const sectors = [bestOf((l) => l.s1), bestOf((l) => l.s2), bestOf((l) => l.s3)]
  return {
    best: bestOf((l) => l.time),
    sectors,
    ideal: sectors.every(Boolean) ? sectors.reduce((sum, s) => sum + s!.time, 0) : null,
  }
}

export interface SpeedTrap {
  driver: string
  speed: number
  lap: number
}

/** Each driver's fastest speed-trap reading, quickest first. */
export function speedTraps(meta: SessionMeta): SpeedTrap[] {
  return Object.entries(meta.laps)
    .map(([driver, laps]) =>
      laps.reduce<SpeedTrap | null>(
        (best, l) =>
          l.speedTrap != null && (!best || l.speedTrap > best.speed)
            ? { driver, speed: l.speedTrap, lap: l.lap }
            : best,
        null,
      ),
    )
    .filter((x): x is SpeedTrap => x != null)
    .sort((a, b) => b.speed - a.speed)
}

export function deletedLaps(
  meta: SessionMeta,
): { driver: string; lap: number; time: number | null }[] {
  return Object.entries(meta.laps)
    .flatMap(([driver, laps]) =>
      laps.filter((l) => l.deleted).map((l) => ({ driver, lap: l.lap, time: l.time })),
    )
    .sort((a, b) => a.driver.localeCompare(b.driver) || a.lap - b.lap)
}

export interface PedalPhases {
  /** Shares of the lap distance, 0-1. */
  fullThrottle: number
  braking: number
  coasting: number
  partial: number
  /** Stretches off both pedals (lift and coast), in metres from the line. */
  coastZones: { from: number; to: number }[]
}

const FULL = 98
const OFF = 10
const MIN_COAST_SAMPLES = 3 // 15 m on the 5 m grid: shorter is just a gear change

/** Where the lap is spent: flat out, on the brakes, coasting, or on part throttle. */
export function pedalPhases(tel: Telemetry, step: number): PedalPhases {
  const n = tel.throttle.length || 1
  let full = 0
  let brake = 0
  let coast = 0
  const zones: PedalPhases['coastZones'] = []
  let run = -1
  for (let i = 0; i <= tel.throttle.length; i++) {
    const t = tel.throttle[i] ?? 100
    const b = tel.brake[i] ?? 0
    const coasting = i < tel.throttle.length && t < OFF && b <= 0
    if (i < tel.throttle.length) {
      if (b > 0) brake++
      else if (t >= FULL) full++
      else if (coasting) coast++
    }
    if (coasting && run < 0) run = i
    if (!coasting && run >= 0) {
      if (i - run >= MIN_COAST_SAMPLES) zones.push({ from: run * step, to: i * step })
      run = -1
    }
  }
  return {
    fullThrottle: full / n,
    braking: brake / n,
    coasting: coast / n,
    partial: Math.max(0, 1 - (full + brake + coast) / n),
    coastZones: zones,
  }
}

export type SectorMark = 'session-best' | 'personal-best' | 'slower' | null

export interface LiveLap {
  lap: number
  /** Speed from the replay's progress, km/h (an average over two seconds). */
  speed: number
  last: {
    lap: number
    time: number | null
    sectors: (number | null)[]
    marks: SectorMark[]
  } | null
}

/** A car's lap timing at replay time t: live speed, current lap and the last completed lap's
 *  sectors, marked against everything completed before t (so nothing is spoiled). */
export function liveLap(meta: SessionMeta, replay: Replay, driver: string, t: number): LiveLap {
  const length = meta.telemetry.length || meta.circuit.length * 1000
  const speed =
    Math.max(0, (progressAt(replay, driver, t + 1) - progressAt(replay, driver, t - 1)) / 2) *
    length *
    3.6
  const starts = replay.lapStarts[driver] ?? []
  let done = 0
  while (done + 1 < starts.length && starts[done + 1] != null && starts[done + 1]! <= t) done++
  const finished = (d: string, lap: number) => {
    const at = replay.lapStarts[d]?.[lap]
    return at != null && at <= t
  }
  const lapRow = (meta.laps[driver] ?? []).find((l) => l.lap === done)
  if (!lapRow || done === 0) return { lap: done + 1, speed, last: null }

  const sectors = [lapRow.s1, lapRow.s2, lapRow.s3]
  const bests = [0, 1, 2].map((k) => {
    let session = Infinity
    let personal = Infinity
    for (const [d, laps] of Object.entries(meta.laps)) {
      for (const l of laps) {
        const v = [l.s1, l.s2, l.s3][k]
        if (v == null || l.deleted || !finished(d, l.lap)) continue
        session = Math.min(session, v)
        if (d === driver) personal = Math.min(personal, v)
      }
    }
    return { session, personal }
  })
  const marks = sectors.map((v, k): SectorMark => {
    if (v == null) return null
    if (v <= bests[k]!.session) return 'session-best'
    if (v <= bests[k]!.personal) return 'personal-best'
    return 'slower'
  })
  return {
    lap: Math.min(done + 1, replay.totalLaps),
    speed,
    last: { lap: done, time: lapRow.time, sectors, marks },
  }
}
