import type { Replay, SessionMeta } from '../data/schema'
import { clamp } from '../util/math'

/**
 * Tyre strategy model, fitted on the race's own laps (no outside assumptions):
 *
 *   lap time = base[compound] + deg[compound] × tyre age + fuel × lap number + driver offset
 *
 * Fitted by least squares on "clean" laps: not lap 1, not in- or out-laps, and within 7% of
 * the driver's median. Pit loss is measured from the race's actual stops. Everything here is
 * an estimate: no traffic, no safety cars, no tyre warm-up differences.
 */

export const DRY_COMPOUNDS = ['SOFT', 'MEDIUM', 'HARD'] as const
export type DryCompound = (typeof DRY_COMPOUNDS)[number]

export interface RaceLap {
  driver: string
  lap: number
  time: number
  compound: string
  age: number
  clean: boolean
}

export interface StintInfo {
  compound: string
  from: number
  to: number
  startAge: number
}

export function stintsFor(replay: Replay, driver: string): StintInfo[] {
  return (replay.stints[driver] ?? []).map((s) => ({
    compound: s.compound,
    from: s.from,
    to: s.to,
    startAge: s.age,
  }))
}

function tyreOn(replay: Replay, driver: string, lap: number) {
  const s = (replay.stints[driver] ?? []).find((x) => lap >= x.from && lap <= x.to)
  return s ? { compound: s.compound, age: s.age + (lap - s.from) + 1 } : null
}

const median = (xs: number[]) => {
  if (!xs.length) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

/** Every timed race lap with its tyre, flagged clean or not. */
export function raceLaps(meta: SessionMeta, replay: Replay): RaceLap[] {
  const out: RaceLap[] = []
  for (const driver of Object.keys(replay.progress)) {
    const pitLaps = new Set(
      replay.pits.filter((p) => p.driver === driver).flatMap((p) => [p.lap, p.lap + 1]),
    )
    const laps = (meta.laps[driver] ?? []).filter((l) => l.time != null)
    const typical = median(laps.map((l) => l.time!))
    for (const l of laps) {
      const tyre = tyreOn(replay, driver, l.lap)
      if (!tyre) continue
      out.push({
        driver,
        lap: l.lap,
        time: l.time!,
        compound: tyre.compound,
        age: tyre.age,
        clean: l.lap > 1 && !pitLaps.has(l.lap) && !l.deleted && l.time! < typical * 1.07,
      })
    }
  }
  return out
}

/** Solves (XᵀX) b = Xᵀy with Gaussian elimination and a tiny ridge for stability. */
function leastSquares(rows: number[][], y: number[]): number[] {
  const k = rows[0]?.length ?? 0
  const a = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0))
  rows.forEach((r, n) => {
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) a[i]![j]! += r[i]! * r[j]!
      a[i]![k]! += r[i]! * y[n]!
    }
  })
  for (let i = 0; i < k; i++) a[i]![i]! += 1e-9
  for (let c = 0; c < k; c++) {
    let pivot = c
    for (let r = c + 1; r < k; r++) if (Math.abs(a[r]![c]!) > Math.abs(a[pivot]![c]!)) pivot = r
    ;[a[c], a[pivot]] = [a[pivot]!, a[c]!]
    const p = a[c]![c]!
    if (Math.abs(p) < 1e-12) continue
    for (let j = c; j <= k; j++) a[c]![j]! /= p
    for (let r = 0; r < k; r++) {
      if (r === c) continue
      const f = a[r]![c]!
      if (!f) continue
      for (let j = c; j <= k; j++) a[r]![j]! -= f * a[c]![j]!
    }
  }
  return a.map((row) => row[k]!)
}

export interface CompoundModel {
  base: number
  deg: number
  laps: number
}

export interface StrategyModel {
  fuel: number
  compounds: Partial<Record<string, CompoundModel>>
  offsets: Record<string, number>
  residualSd: number
  pitLoss: number
  pitLossSd: number
}

export function fitModel(meta: SessionMeta, replay: Replay): StrategyModel {
  const laps = raceLaps(meta, replay)
  const clean = laps.filter((l) => l.clean)
  const compounds = [...new Set(clean.map((l) => l.compound))]
  const drivers = [...new Set(clean.map((l) => l.driver))]
  const ref = drivers[0]
  // Columns: [base_c..., deg_c..., fuel, offset_d (all but the first driver)]
  const nc = compounds.length
  const rows = clean.map((l) => {
    const r = new Array<number>(nc * 2 + 1 + drivers.length - 1).fill(0)
    const c = compounds.indexOf(l.compound)
    r[c] = 1
    r[nc + c] = l.age
    r[nc * 2] = l.lap
    const d = drivers.indexOf(l.driver)
    if (d > 0) r[nc * 2 + d] = 1
    return r
  })
  const b = leastSquares(
    rows,
    clean.map((l) => l.time),
  )
  const model: StrategyModel = {
    fuel: b[nc * 2] ?? 0,
    compounds: {},
    offsets: Object.fromEntries(drivers.map((d, i) => [d, i === 0 ? 0 : (b[nc * 2 + i] ?? 0)])),
    residualSd: 0,
    pitLoss: 0,
    pitLossSd: 0,
  }
  if (ref) model.offsets[ref] = 0
  compounds.forEach((c, i) => {
    model.compounds[c] = {
      base: b[i] ?? 0,
      deg: b[nc + i] ?? 0,
      laps: clean.filter((l) => l.compound === c).length,
    }
  })
  const residuals = clean.map((l) => l.time - predictLap(model, l.driver, l.compound, l.age, l.lap))
  model.residualSd = Math.sqrt(
    residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, residuals.length - 1),
  )

  // Pit loss: in-lap + out-lap minus two modelled clean laps, median over all stops.
  const byKey = new Map(laps.map((l) => [`${l.driver}-${l.lap}`, l]))
  const losses = replay.pits
    .map((p) => {
      const inLap = byKey.get(`${p.driver}-${p.lap}`)
      const outLap = byKey.get(`${p.driver}-${p.lap + 1}`)
      if (!inLap || !outLap) return null
      const expected =
        predictLap(model, p.driver, inLap.compound, inLap.age, inLap.lap) +
        predictLap(model, p.driver, outLap.compound, outLap.age, outLap.lap)
      return inLap.time + outLap.time - expected
    })
    .filter((x): x is number => x != null && x > 5 && x < 60)
  model.pitLoss = median(losses) || 22
  const mean = losses.reduce((s, x) => s + x, 0) / Math.max(1, losses.length)
  model.pitLossSd =
    Math.sqrt(losses.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, losses.length - 1)) || 1
  return model
}

export function predictLap(
  model: StrategyModel,
  driver: string,
  compound: string,
  age: number,
  lap: number,
): number {
  const c = model.compounds[compound] ?? Object.values(model.compounds)[0]!
  return c.base + c.deg * age + model.fuel * lap + (model.offsets[driver] ?? 0)
}

/** Modelled race time for a set of stints (pit loss added per stop). */
function modelledTime(model: StrategyModel, driver: string, stints: StintInfo[]): number {
  let total = 0
  stints.forEach((s, i) => {
    for (let lap = Math.max(s.from, 2); lap <= s.to; lap++) {
      total += predictLap(model, driver, s.compound, s.startAge + (lap - s.from) + 1, lap)
    }
    if (i > 0) total += model.pitLoss
  })
  return total
}

/** Deterministic pseudo-random numbers so a simulation gives the same answer every time. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(next: () => number) {
  const u = Math.max(next(), 1e-12)
  const v = next()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export interface SimulationResult {
  driver: string
  pitLap: number
  compound: string
  legal: boolean
  actualTime: number
  actualPosition: number
  projectedTime: number
  delta: number
  /** Share of simulations finishing in each position (index 0 = P1). */
  positions: number[]
  p10: number
  p50: number
  p90: number
}

/**
 * What if `driver` had made a single stop on `pitLap` onto `compound`? The difference between
 * the modelled alternative and the modelled actual strategy is added to the real finish time,
 * so model bias cancels out. Monte Carlo noise comes from the model's lap residuals and the
 * spread of real pit losses. Other drivers keep their real finish times.
 */
export function simulateOneStop(
  meta: SessionMeta,
  replay: Replay,
  model: StrategyModel,
  driver: string,
  pitLap: number,
  compound: string,
  runs = 500,
): SimulationResult {
  const total = replay.totalLaps
  const result = replay.classification.find((c) => c.driver === driver)
  if (!result || result.time == null || result.laps !== total) {
    throw new Error(
      `${driver} didn't finish on the lead lap, so there's no finish time to compare.`,
    )
  }
  const lap = clamp(pitLap, 2, total - 1)
  const actual = stintsFor(replay, driver)
  const first = actual[0]!
  const alternative: StintInfo[] = [
    { compound: first.compound, from: 1, to: lap, startAge: first.startAge },
    { compound, from: lap + 1, to: total, startAge: 0 },
  ]
  const delta = modelledTime(model, driver, alternative) - modelledTime(model, driver, actual)
  const projected = result.time + delta

  const rivals = replay.classification
    .filter((c) => c.driver !== driver && c.status === 'Finished' && c.time != null)
    .map((c) => c.time!)
  const next = rng(pitLap * 7919 + compound.length * 104729 + driver.charCodeAt(0))
  const lapsRun = total - 1
  const counts = new Array<number>(replay.classification.length).fill(0)
  const outcomes: number[] = []
  for (let i = 0; i < runs; i++) {
    const noise =
      gaussian(next) * model.residualSd * Math.sqrt(lapsRun) * 0.35 +
      gaussian(next) * model.pitLossSd
    const t = projected + noise
    const position = 1 + rivals.filter((r) => r < t).length
    counts[position - 1]! += 1
    outcomes.push(position)
  }
  outcomes.sort((a, b) => a - b)
  const q = (p: number) => outcomes[Math.min(outcomes.length - 1, Math.floor(p * outcomes.length))]!
  return {
    driver,
    pitLap: lap,
    compound,
    legal: compound !== first.compound,
    actualTime: result.time,
    actualPosition: result.position,
    projectedTime: projected,
    delta,
    positions: counts.map((c) => c / runs),
    p10: q(0.1),
    p50: q(0.5),
    p90: q(0.9),
  }
}

export interface UndercutResult {
  attacker: string
  defender: string
  lap: number
  compound: string
  gapBefore: number
  gapAfter: number
  works: boolean
  margin: number
}

/**
 * Attacker pits at the end of `lap`, defender one lap later, both onto `compound`.
 * Gap after both stops = gap before + attacker's two laps on new tyres
 *   − (defender's extra lap on old tyres + defender's out-lap). Both pay the same pit loss.
 */
export function undercut(
  meta: SessionMeta,
  replay: Replay,
  model: StrategyModel,
  attacker: string,
  defender: string,
  lap: number,
  compound?: string,
): UndercutResult {
  const lineA = replay.lapStarts[attacker]?.[lap]
  const lineD = replay.lapStarts[defender]?.[lap]
  if (lineA == null || lineD == null) {
    throw new Error(`Both drivers need to have completed lap ${lap}.`)
  }
  const gapBefore = lineA - lineD
  if (gapBefore <= 0) throw new Error(`${attacker} was already ahead of ${defender} on lap ${lap}.`)
  const oldD = tyreOn(replay, defender, lap + 1) ?? tyreOn(replay, defender, lap)!
  const oldA = tyreOn(replay, attacker, lap)!
  const target = compound ?? (oldA.compound === 'HARD' ? 'MEDIUM' : 'HARD')
  const newA =
    predictLap(model, attacker, target, 1, lap + 1) +
    predictLap(model, attacker, target, 2, lap + 2)
  const defenderLaps =
    predictLap(model, defender, oldD.compound, oldD.age + 1, lap + 1) +
    predictLap(model, defender, target, 1, lap + 2)
  const gapAfter = gapBefore + newA - defenderLaps
  return {
    attacker,
    defender,
    lap,
    compound: target,
    gapBefore,
    gapAfter,
    works: gapAfter < 0,
    margin: -gapAfter,
  }
}

export type UndercutWindowCell =
  | { lap: number; status: 'works' | 'short'; margin: number }
  | { lap: number; status: 'ahead' | 'unavailable' }

/** The undercut check at every lap the attacker could have pitted: where it would have
 *  worked, where it falls short, and where the attacker was already ahead. */
export function undercutWindow(
  meta: SessionMeta,
  replay: Replay,
  model: StrategyModel,
  attacker: string,
  defender: string,
): UndercutWindowCell[] {
  const cells: UndercutWindowCell[] = []
  for (let lap = 1; lap <= replay.totalLaps - 3; lap++) {
    const lineA = replay.lapStarts[attacker]?.[lap]
    const lineD = replay.lapStarts[defender]?.[lap]
    if (lineA == null || lineD == null) {
      cells.push({ lap, status: 'unavailable' })
      continue
    }
    if (lineA <= lineD) {
      cells.push({ lap, status: 'ahead' })
      continue
    }
    try {
      const r = undercut(meta, replay, model, attacker, defender, lap)
      cells.push({
        lap,
        status: r.works ? 'works' : 'short',
        margin: r.works ? r.margin : -Math.abs(r.gapAfter),
      })
    } catch {
      cells.push({ lap, status: 'unavailable' })
    }
  }
  return cells
}
