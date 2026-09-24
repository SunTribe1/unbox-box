import { describe, expect, it } from 'vitest'
import { fitModel, pitRejoin, raceLaps, simulateOneStop, undercut } from '../src'
import { loadMeta, loadReplay, RACE_ID } from './context'

const meta = loadMeta(RACE_ID)
const replay = loadReplay()
const model = fitModel(meta, replay)

describe('strategy model', () => {
  it('keeps most laps as clean laps', () => {
    const laps = raceLaps(meta, replay)
    const clean = laps.filter((l) => l.clean).length
    expect(clean / laps.length).toBeGreaterThan(0.8)
  })

  it('fits plausible tyre and fuel effects', () => {
    expect(model.fuel).toBeLessThan(0) // cars get faster as fuel burns
    expect(model.fuel).toBeGreaterThan(-0.15)
    for (const c of Object.values(model.compounds)) {
      expect(c!.deg).toBeGreaterThan(-0.05)
      expect(c!.deg).toBeLessThan(0.2)
    }
    expect(model.residualSd).toBeLessThan(1)
  })

  it('measures a Monza-like pit loss', () => {
    expect(model.pitLoss).toBeGreaterThan(15)
    expect(model.pitLoss).toBeLessThan(30)
  })

  it('simulates the real strategy with no change', () => {
    const ver = replay.stints.VER!
    const sim = simulateOneStop(meta, replay, model, 'VER', ver[0]!.to, ver[1]!.compound)
    expect(Math.abs(sim.delta)).toBeLessThan(0.5)
    expect(sim.p50).toBe(1)
    expect(sim.positions.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5)
  })

  it('flags a one-stop on the same compound as illegal in the dry', () => {
    const sim = simulateOneStop(meta, replay, model, 'LEC', 30, replay.stints.LEC![0]!.compound)
    expect(sim.legal).toBe(false)
  })

  it('refuses drivers who were not on the lead lap', () => {
    expect(() => simulateOneStop(meta, replay, model, 'ALO', 20, 'HARD')).toThrow(/lead lap/)
  })

  it('evaluates an undercut with a signed margin', () => {
    const r = undercut(meta, replay, model, 'PIA', 'NOR', 20)
    expect(r.gapBefore).toBeGreaterThan(0)
    expect(r.works).toBe(r.margin > 0)
  })
})

describe('pitRejoin', () => {
  const row = (driver: string, position: number, gap: number | null, state = 'running') => ({
    driver,
    position,
    progress: 10,
    lap: 11,
    gap: gap == null ? null : { seconds: gap },
    interval: null,
    state,
    compound: 'MEDIUM',
    tyreAge: 10,
    pitStops: 0,
  })
  const table = [
    row('VER', 1, null),
    row('NOR', 2, 3),
    row('PIA', 3, 18),
    row('LEC', 4, 27.5),
    row('HAM', 5, 40),
  ] as Parameters<typeof pitRejoin>[0]

  it('places a stop by adding the pit loss to the gap', () => {
    const r = pitRejoin(table, 'NOR', 22)!
    expect(r.position).toBe(3) // 3 + 22 = 25: behind VER and PIA (18), ahead of LEC (27.5)
    expect(r.ahead).toEqual({ driver: 'PIA', margin: 7 })
    expect(r.behind).toEqual({ driver: 'LEC', margin: 2.5 })
  })

  it('works for the leader and for the last car', () => {
    expect(pitRejoin(table, 'VER', 22)!.position).toBe(3)
    const last = pitRejoin(table, 'HAM', 22)!
    expect(last.position).toBe(5)
    expect(last.behind).toBeNull()
  })

  it('is null for a car that is not running', () => {
    expect(
      pitRejoin([...table.slice(0, 4), row('HAM', 5, null, 'out')] as never, 'HAM', 22),
    ).toBeNull()
  })
})

describe('undercut window', () => {
  it('checks every lap and agrees with the single-lap check', async () => {
    const { undercut, undercutWindow, fitModel } = await import('../src')
    const { loadMeta, loadReplay, RACE_ID } = await import('./context')
    const meta = loadMeta(RACE_ID)
    const replay = loadReplay()
    const model = fitModel(meta, replay)
    const [, second, third] = replay.classification
    const cells = undercutWindow(meta, replay, model, third!.driver, second!.driver)
    expect(cells).toHaveLength(replay.totalLaps - 3)
    const checked = cells.find((c) => c.status === 'works' || c.status === 'short')!
    const single = undercut(meta, replay, model, third!.driver, second!.driver, checked.lap)
    expect(checked.status === 'works').toBe(single.works)
  })
})
