import type { Replay } from '../data/schema'
import { clamp } from '../util/math'

/** Pure race-replay maths. Progress = laps + fraction of a lap, sampled every `step`
 *  seconds of race time (see pipeline/unbox_box_pipeline/replay.py). */

export function progressAt(replay: Replay, driver: string, t: number): number {
  const series = replay.progress[driver]
  if (!series?.length) return 0
  const x = Math.max(0, t / replay.step)
  const i = Math.min(Math.floor(x), series.length - 1)
  const j = Math.min(i + 1, series.length - 1)
  const f = x - i
  return ((series[i] ?? 0) * (1 - f) + (series[j] ?? 0) * f) / replay.scale
}

/** Race time when a driver first reaches `progress`, or null if they never do. */
export function timeAtProgress(replay: Replay, driver: string, progress: number): number | null {
  const series = replay.progress[driver]
  if (!series?.length) return null
  const target = progress * replay.scale
  if ((series.at(-1) ?? 0) < target) return null
  let lo = 0
  let hi = series.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if ((series[mid] ?? 0) < target) lo = mid + 1
    else hi = mid
  }
  if (lo === 0) return 0
  const a = series[lo - 1] ?? 0
  const b = series[lo] ?? 0
  const f = b === a ? 0 : (target - a) / (b - a)
  return (lo - 1 + f) * replay.step
}

export type CarState = 'running' | 'pit' | 'finished' | 'out' | 'dns'

export interface Standing {
  position: number
  driver: string
  progress: number
  lap: number
  /** Seconds behind the leader, or whole laps when lapped. */
  gap: { seconds: number } | { laps: number } | null
  interval: { seconds: number } | { laps: number } | null
  state: CarState
  compound: string | null
  tyreAge: number
  pitStops: number
}

function classified(replay: Replay, driver: string) {
  return replay.classification.find((c) => c.driver === driver)
}

function finishTime(replay: Replay, driver: string): number | null {
  return classified(replay, driver)?.time ?? null
}

/** Live-timing gap: how long ago the car ahead passed the point where the car behind is
 *  now. Always consistent with track order, like a real timing screen. */
function gapBetween(replay: Replay, ahead: string, behind: string, t: number) {
  const pAhead = progressAt(replay, ahead, t)
  const pBehind = progressAt(replay, behind, t)
  const lapsDown = Math.floor(pAhead - pBehind)
  if (lapsDown >= 1) return { laps: lapsDown }
  const passed = timeAtProgress(replay, ahead, pBehind)
  return passed == null ? null : { seconds: Math.max(0, t - passed) }
}

export function tyreAt(replay: Replay, driver: string, lap: number) {
  const stints = replay.stints[driver] ?? []
  const stint = stints.find((s) => lap >= s.from && lap <= s.to) ?? stints.at(-1)
  if (!stint) return { compound: null, age: 0 }
  return { compound: stint.compound, age: stint.age + Math.max(0, lap - stint.from) + 1 }
}

export function stateAt(replay: Replay, driver: string, t: number): CarState {
  const result = classified(replay, driver)
  if (result?.status === 'DNS') return 'dns'
  const finish = finishTime(replay, driver)
  if (finish != null && t >= finish) return result?.status === 'DNF' ? 'out' : 'finished'
  if (
    replay.pits.some(
      (p) => p.driver === driver && p.in != null && t >= p.in && t <= (p.out ?? p.in),
    )
  ) {
    return 'pit'
  }
  return 'running'
}

/** The live timing tower at race time t. */
export function standingsAt(replay: Replay, t: number): Standing[] {
  const drivers = Object.keys(replay.progress)
  const rank = (d: string) => {
    const s = stateAt(replay, d, t)
    if (s === 'dns') return -2
    if (s === 'out') return -1
    return progressAt(replay, d, t)
  }
  // Finished cars keep their finishing order.
  const order = drivers
    .map((d) => ({
      d,
      r: rank(d),
      fin: stateAt(replay, d, t) === 'finished' ? finishTime(replay, d) : null,
    }))
    .sort((x, y) => {
      if (x.fin != null && y.fin != null) {
        const lx = classified(replay, x.d)?.position ?? 99
        const ly = classified(replay, y.d)?.position ?? 99
        return lx - ly
      }
      return y.r - x.r
    })
    .map((x) => x.d)

  const leader = order[0]!
  return order.map((driver, i) => {
    const progress = progressAt(replay, driver, t)
    const state = stateAt(replay, driver, t)
    // Progress is slightly negative on the grid (behind the line), which is still lap 1.
    const lap = lapOf(replay, progress)
    const tyre = tyreAt(replay, driver, lap)
    const running = state === 'running' || state === 'pit'
    return {
      position: i + 1,
      driver,
      progress,
      lap,
      gap: i === 0 || !running ? null : gapBetween(replay, leader, driver, t),
      interval: i === 0 || !running ? null : gapBetween(replay, order[i - 1]!, driver, t),
      state,
      compound: tyre.compound,
      tyreAge: tyre.age,
      pitStops: replay.pits.filter((p) => p.driver === driver && p.in != null && p.in <= t).length,
    }
  })
}

function lapOf(replay: Replay, progress: number): number {
  return clamp(Math.floor(progress) + 1, 1, replay.totalLaps)
}

export function leaderLapAt(replay: Replay, t: number): number {
  const leader = standingsAt(replay, t)[0]
  return leader ? lapOf(replay, leader.progress) : 1
}

/** Race time when the leader started `lap` (1-based): the first car to start it, which is
 *  not always the eventual winner. */
export function timeOfLap(replay: Replay, lap: number): number {
  const clamped = clamp(lap, 1, replay.totalLaps)
  const starts = Object.values(replay.lapStarts)
    .map((laps) => laps[clamped - 1])
    .filter((t): t is number => t != null)
  return starts.length ? Math.min(...starts) : 0
}

export function trackStatusAt(replay: Replay, t: number): 'green' | 'sc' | 'vsc' | 'red' {
  return replay.trackStatus.find((s) => t >= s.from && t <= s.to)?.status ?? 'green'
}

export function formatRaceTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

export function formatInterval(gap: Standing['gap']): string {
  if (!gap) return ''
  if ('laps' in gap) return `+${gap.laps} L`
  return `+${gap.seconds.toFixed(gap.seconds < 10 ? 3 : 1)}`
}

export type GapRow = { lap: number } & Record<string, number | null>

/** Gap to the leader at the end of every lap, for a race-long "spaghetti" chart. A driver
 *  who hasn't reached the line (retired, not started) or who crosses it after the leader has
 *  completed another lap (lapped) gets null, so their line stops instead of spiking. */
export function gapHistory(replay: Replay, drivers: string[]): GapRow[] {
  const everyone = Object.keys(replay.progress)
  const leaderAt = (lap: number) => {
    let best = Infinity
    for (const d of everyone) {
      const t = timeAtProgress(replay, d, lap)
      if (t != null && t < best) best = t
    }
    return Number.isFinite(best) ? best : null
  }
  const rows: GapRow[] = []
  let next = leaderAt(1)
  for (let lap = 1; lap <= replay.totalLaps; lap++) {
    const lead = next
    next = lap < replay.totalLaps ? leaderAt(lap + 1) : null
    const row: GapRow = { lap }
    for (const d of drivers) {
      const t = timeAtProgress(replay, d, lap)
      const lapped = t != null && next != null && t > next
      row[d] = t == null || lead == null || lapped ? null : Math.round((t - lead) * 1000) / 1000
    }
    rows.push(row)
  }
  return rows
}

export interface RejoinResult {
  /** Running position now and after the stop. */
  current: number
  position: number
  ahead: { driver: string; margin: number } | null
  behind: { driver: string; margin: number } | null
}

/** Where a car would rejoin if it pitted now: its gap to the leader plus the pit loss,
 *  placed among the cars still on the lead lap. Lapped cars always count as behind. */
export function pitRejoin(
  standings: Standing[],
  driver: string,
  pitLoss: number,
): RejoinResult | null {
  const me = standings.find((s) => s.driver === driver)
  if (!me || (me.state !== 'running' && me.state !== 'pit')) return null
  const gapOf = (s: Standing) =>
    s.position === 1 ? 0 : s.gap && 'seconds' in s.gap ? s.gap.seconds : null
  const mine = gapOf(me)
  if (mine == null) return null
  const target = mine + pitLoss
  const others = standings
    .filter((s) => s.driver !== driver && (s.state === 'running' || s.state === 'pit'))
    .map((s) => ({ driver: s.driver, gap: gapOf(s) }))
  const onLap = others.filter((o): o is { driver: string; gap: number } => o.gap != null)
  const aheadOf = onLap.filter((o) => o.gap < target).sort((a, b) => b.gap - a.gap)
  const behindOf = onLap.filter((o) => o.gap >= target).sort((a, b) => a.gap - b.gap)
  const round = (x: number) => Math.round(x * 10) / 10
  return {
    current: me.position,
    position: aheadOf.length + 1,
    ahead: aheadOf[0]
      ? { driver: aheadOf[0].driver, margin: round(target - aheadOf[0].gap) }
      : null,
    behind: behindOf[0]
      ? { driver: behindOf[0].driver, margin: round(behindOf[0].gap - target) }
      : null,
  }
}
