import { describe, expect, it } from 'vitest'
import {
  formatRaceControl,
  compareSections,
  deltaSeries,
  formatGap,
  formatLapTime,
  lapStats,
  miniSectors,
  trackSections,
} from '../src'
import { createTestContext, loadMeta, SESSION_ID } from './context'

const meta = loadMeta()
const ctx = createTestContext()
const ver = await ctx.getTelemetry(SESSION_ID, 'VER', 17)
const nor = await ctx.getTelemetry(SESSION_ID, 'NOR', 20)
const lapTimes = { a: 78.792, b: 78.869 }

describe('data', () => {
  it('matches the real 2025 Monza qualifying result', () => {
    expect(meta.results.slice(0, 3).map((r) => [r.driver, r.time])).toEqual([
      ['VER', 78.792],
      ['NOR', 78.869],
      ['PIA', 78.982],
    ])
    expect(ver.t).toHaveLength(meta.telemetry.points)
  })
})

describe('format', () => {
  it('formats lap times and gaps', () => {
    expect(formatLapTime(78.792)).toBe('1:18.792')
    expect(formatLapTime(59.5)).toBe('59.500')
    expect(formatGap(0.077)).toBe('+0.077')
    expect(formatGap(-0.1)).toBe('−0.100')
  })
})

describe('lap analysis', () => {
  it('delta ends close to the official gap', () => {
    const delta = deltaSeries(ver, nor)
    expect(delta.at(-1)).toBeCloseTo(0.077, 1)
  })

  it('mini-sector deltas add up to the lap-time gap', () => {
    const sectors = miniSectors(ver, nor, meta, lapTimes)
    const sum = sectors.reduce((acc, s) => acc + s.delta, 0)
    expect(sum).toBeCloseTo(0.077, 3)
    expect(sectors).toHaveLength(25)
  })

  it('groups Monza chicanes into seven named sections', () => {
    const sections = trackSections(meta)
    expect(sections.map((s) => s.turns)).toEqual(['T1–2', 'T3', 'T4–5', 'T6', 'T7', 'T8–10', 'T11'])
    expect(sections[0]!.start).toBe(0)
    expect(sections.at(-1)!.end).toBe(meta.telemetry.length)
  })

  it('section deltas also add up to the gap', () => {
    const sum = compareSections(meta, ver, nor, lapTimes).reduce((acc, s) => acc + s.delta, 0)
    expect(sum).toBeCloseTo(0.077, 3)
  })

  it('computes lap stats', () => {
    const stats = lapStats(ver)
    expect(stats.topSpeed).toBeGreaterThan(330)
    expect(stats.fullThrottle).toBeGreaterThan(0.6)
  })
})

describe('formatRaceControl', () => {
  it('sentence-cases official messages but keeps acronyms and driver codes', () => {
    expect(
      formatRaceControl(
        'FIA STEWARDS: PIT LANE INCIDENT INVOLVING CARS 2 (SAR) AND 31 (OCO) UNDER INVESTIGATION',
      ),
    ).toBe(
      'FIA stewards: pit lane incident involving cars 2 (SAR) and 31 (OCO) under investigation',
    )
    expect(formatRaceControl('DRS ENABLED')).toBe('DRS enabled')
    expect(formatRaceControl('VIRTUAL SAFETY CAR DEPLOYED')).toBe('Virtual safety car deployed')
    expect(
      formatRaceControl(
        'CAR 55 (SAI) TIME 1:10.395 DELETED - TRACK LIMITS AT TURN 9 LAP 11 15:17:23',
      ),
    ).toBe('Car 55 (SAI) time 1:10.395 deleted - track limits at turn 9 lap 11 15:17:23')
  })
})
