import { describe, expect, it } from 'vitest'
import {
  deletedLaps,
  idealLap,
  liveLap,
  parse,
  pedalPhases,
  positionHistory,
  speedTraps,
  TelemetrySchema,
} from '../src'
import { DATA_DIR, loadMeta, loadReplay, RACE_ID } from './context'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const race = loadMeta(RACE_ID)
const quali = loadMeta()
const replay = loadReplay()

describe('position history', () => {
  const h = positionHistory(replay)
  it('starts from the grid and ends with the classification', () => {
    expect(h.laps[0]).toBe(0)
    expect(h.rows.VER![0]).toBe(1) // pole at Monza 2025
    const last = replay.totalLaps
    const podium = Object.entries(h.rows)
      .filter(([, r]) => r[last] != null)
      .sort(([, a], [, b]) => a[last]! - b[last]!)
      .slice(0, 3)
      .map(([d]) => d)
    expect(podium).toEqual(['VER', 'NOR', 'PIA'])
  })
  it('never repeats a position on a lap', () => {
    for (const lap of h.laps) {
      const taken = Object.values(h.rows)
        .map((r) => r[lap])
        .filter((p) => p != null)
      expect(new Set(taken).size).toBe(taken.length)
    }
  })
})

describe('lap records', () => {
  it('stitches the ideal lap from best sectors', () => {
    const lap = idealLap(quali, 'VER')
    expect(lap.ideal).not.toBeNull()
    expect(lap.ideal!).toBeLessThanOrEqual(lap.best!.time + 0.001)
  })
  it('ranks speed traps and lists deleted laps', () => {
    const traps = speedTraps(quali)
    expect(traps[0]!.speed).toBeGreaterThan(330)
    expect(traps.map((t) => t.speed)).toEqual([...traps.map((t) => t.speed)].sort((a, b) => b - a))
    expect(
      deletedLaps(quali).every((l) => quali.laps[l.driver]!.find((x) => x.lap === l.lap)!.deleted),
    ).toBe(true)
  })
})

describe('pedal phases', () => {
  it('splits a Monza lap into mostly flat out, some braking', () => {
    const best = quali.results[0]!
    const tel = TelemetrySchema.parse(
      JSON.parse(
        readFileSync(
          join(DATA_DIR, `sessions/${quali.id}/tel/${best.driver}-${best.lap}.json`),
          'utf8',
        ),
      ),
    )
    const p = pedalPhases(tel, quali.telemetry.step)
    expect(p.fullThrottle).toBeGreaterThan(0.7) // Monza is the fastest lap of the year
    expect(p.braking).toBeGreaterThan(0.03)
    expect(p.fullThrottle + p.braking + p.coasting + p.partial).toBeCloseTo(1, 5)
  })
})

describe('live lap', () => {
  it('shows speed and the last lap without spoiling later ones', () => {
    const t = replay.lapStarts.VER![10]! + 20
    const live = liveLap(race, replay, 'VER', t)
    expect(live.lap).toBe(11)
    expect(live.speed).toBeGreaterThan(60)
    expect(live.speed).toBeLessThan(370)
    expect(live.last?.lap).toBe(10)
    expect(live.last?.marks.every((m) => m !== null)).toBe(true)
  })
  it('has no last lap on the opening lap', () => {
    expect(liveLap(race, replay, 'VER', 20).last).toBeNull()
  })
})

void parse
