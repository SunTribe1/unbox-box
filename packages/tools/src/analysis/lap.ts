import type { Corner, SessionMeta, Telemetry } from '../data/schema'
import { clamp } from '../util/math'

/** Pure lap analysis. Telemetry arrays share one distance grid (meta.telemetry.step metres),
 *  so index i means the same place on track for every lap. */

export type Side = 'a' | 'b' | 'even'
/** One of the two drivers being compared. */
export type DuelSide = Exclude<Side, 'even'>

/** Time gap of lap B relative to lap A at every grid point. Positive = B behind. */
export function deltaSeries(a: Telemetry, b: Telemetry): number[] {
  const n = Math.min(a.t.length, b.t.length)
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = (b.t[i] ?? 0) - (a.t[i] ?? 0)
  return out
}

function timeAtIndex(t: number[], i: number): number {
  return t[clamp(i, 0, t.length - 1)] ?? 0
}

/** Time a lap spent between two distances (metres). The last segment runs to the finish. */
export function segmentTime(
  tel: Telemetry,
  lapTime: number | null,
  step: number,
  from: number,
  to: number,
): number {
  const i0 = Math.round(from / step)
  const endIndex = Math.round(to / step)
  const start = timeAtIndex(tel.t, i0)
  const end = endIndex >= tel.t.length && lapTime != null ? lapTime : timeAtIndex(tel.t, endIndex)
  return end - start
}

export interface MiniSector {
  index: number
  from: number
  to: number
  /** B time minus A time in this mini-sector (positive = A faster). */
  delta: number
  winner: Side
}

export function miniSectors(
  a: Telemetry,
  b: Telemetry,
  meta: SessionMeta,
  lapTimes: { a: number | null; b: number | null },
  count = 25,
  evenThreshold = 0.004,
): MiniSector[] {
  const { length, step } = meta.telemetry
  const size = length / count
  return Array.from({ length: count }, (_, index) => {
    const from = index * size
    const to = (index + 1) * size
    const delta =
      segmentTime(b, lapTimes.b, step, from, to) - segmentTime(a, lapTimes.a, step, from, to)
    const winner: Side = Math.abs(delta) < evenThreshold ? 'even' : delta > 0 ? 'a' : 'b'
    return { index, from, to, delta, winner }
  })
}

export interface TrackSection {
  id: string
  name: string
  corners: number[]
  /** Short label, e.g. "T1–2". */
  turns: string
  start: number
  end: number
  apex: number
  /** Narrower range around the corners themselves, for highlighting. */
  focus: { from: number; to: number }
}

/** Groups corners that share a name (chicanes) and splits the lap at the midpoints between
 *  groups, so each section covers its braking zone, the corner and half the exit. */
export function trackSections(meta: SessionMeta): TrackSection[] {
  const groups: { name: string; corners: Corner[] }[] = []
  for (const corner of meta.circuit.corners) {
    const name = corner.name ?? `Turn ${corner.number}`
    const last = groups.at(-1)
    if (last && last.name === name) last.corners.push(corner)
    else groups.push({ name, corners: [corner] })
  }
  const length = meta.telemetry.length
  return groups.map((group, i) => {
    const first = group.corners[0]!
    const lastCorner = group.corners.at(-1)!
    const prev = groups[i - 1]?.corners.at(-1)
    const next = groups[i + 1]?.corners[0]
    const start = prev ? (prev.distance + first.distance) / 2 : 0
    const end = next ? (lastCorner.distance + next.distance) / 2 : length
    const numbers = group.corners.map((c) => c.number)
    const turns = numbers.length > 1 ? `T${numbers[0]}–${numbers.at(-1)}` : `T${numbers[0] ?? ''}`
    return {
      id: `s${first.number}`,
      name: group.name,
      corners: numbers,
      turns,
      start,
      end,
      apex: (first.distance + lastCorner.distance) / 2,
      focus: {
        from: Math.max(start, first.distance - 180),
        to: Math.min(end, lastCorner.distance + 120),
      },
    }
  })
}

export function sectionForCorner(meta: SessionMeta, corner: number): TrackSection | undefined {
  return trackSections(meta).find((s) => s.corners.includes(corner))
}

export interface SectionComparison {
  section: TrackSection
  /** B minus A inside this section (positive = A faster here). */
  delta: number
  minSpeed: { a: number; b: number }
  brakePoint: { a: number | null; b: number | null }
}

function minInRange(values: number[], i0: number, i1: number): number {
  let min = Infinity
  for (let i = Math.max(0, i0); i <= Math.min(values.length - 1, i1); i++) {
    const v = values[i] ?? Infinity
    if (v < min) min = v
  }
  return Number.isFinite(min) ? min : 0
}

/** First distance where the brake goes on inside the section, before its apex. */
function brakePoint(tel: Telemetry, step: number, start: number, apex: number): number | null {
  for (let i = Math.round(start / step); i <= Math.round(apex / step); i++) {
    if ((tel.brake[i] ?? 0) > 0) return i * step
  }
  return null
}

export function compareSections(
  meta: SessionMeta,
  a: Telemetry,
  b: Telemetry,
  lapTimes: { a: number | null; b: number | null },
): SectionComparison[] {
  const { step } = meta.telemetry
  return trackSections(meta).map((section) => {
    const i0 = Math.round((section.apex - 120) / step)
    const i1 = Math.round((section.apex + 120) / step)
    return {
      section,
      delta:
        segmentTime(b, lapTimes.b, step, section.start, section.end) -
        segmentTime(a, lapTimes.a, step, section.start, section.end),
      minSpeed: { a: minInRange(a.speed, i0, i1), b: minInRange(b.speed, i0, i1) },
      brakePoint: {
        a: brakePoint(a, step, section.start, section.apex),
        b: brakePoint(b, step, section.start, section.apex),
      },
    }
  })
}

export interface LapStats {
  topSpeed: number
  minSpeed: number
  fullThrottle: number // share of distance at >= 98% throttle
  braking: number // share of distance on the brakes
  drs: number // share of distance with DRS open
}

export function lapStats(tel: Telemetry): LapStats {
  const n = tel.speed.length || 1
  let full = 0
  let brake = 0
  let drs = 0
  for (let i = 0; i < tel.speed.length; i++) {
    if ((tel.throttle[i] ?? 0) >= 98) full++
    if ((tel.brake[i] ?? 0) > 0) brake++
    if ((tel.drs[i] ?? 0) > 0) drs++
  }
  return {
    topSpeed: Math.max(...tel.speed),
    minSpeed: Math.min(...tel.speed),
    fullThrottle: full / n,
    braking: brake / n,
    drs: drs / n,
  }
}
