import { describe, expect, it } from 'vitest'
import {
  careerBySeason,
  circuitWinners,
  headToHead,
  historicDriver,
  parse,
  ranking,
  resolveCircuit,
  resolveHistoricDriver,
  runCalls,
} from '../src'
import { createTestContext, loadHistory, loadMeta } from './context'

const data = loadHistory()
const id = (q: string) => historicDriver(data, resolveHistoricDriver(data, q)).id

describe('history data', () => {
  it('resolves drivers from any era', () => {
    expect(id('Senna')).toBe('ayrton-senna')
    expect(id('Schumacher')).toBe('michael-schumacher') // the more successful Schumacher
    expect(id('Ralf Schumacher')).toBe('ralf-schumacher')
    expect(id('VER')).toBe('max-verstappen')
    expect(id('Fangio')).toBe('juan-manuel-fangio')
    expect(() => resolveHistoricDriver(data, 'Nobody Atall')).toThrow(/No Formula 1 driver/)
  })

  it('ranks all-time and filtered records', () => {
    const titles = ranking(data, 'titles', {}, 3)
    expect(titles[0]!.value).toBeGreaterThanOrEqual(7)
    expect(['lewis-hamilton', 'michael-schumacher']).toContain(
      historicDriver(data, titles[0]!.driver).id,
    )
    const monza = resolveCircuit(data, 'Monza')
    const winsAtMonza = ranking(data, 'wins', { circuit: monza }, 1)[0]!
    expect(winsAtMonza.value).toBeGreaterThanOrEqual(5)
    const nineties = ranking(data, 'wins', { from: 1990, to: 1999 }, 1)[0]!
    expect(historicDriver(data, nineties.driver).id).toBe('michael-schumacher')
  })

  it('computes head-to-heads, including as teammates', () => {
    const h = headToHead(
      data,
      resolveHistoricDriver(data, 'Senna'),
      resolveHistoricDriver(data, 'Prost'),
    )
    expect(h.together).toBeGreaterThan(90)
    expect(h.teammateRaces).toBeGreaterThanOrEqual(30)
    expect(h.finishedAhead.a + h.finishedAhead.b).toBeLessThanOrEqual(h.together)
  })

  it('builds careers and circuit winners', () => {
    const seasons = careerBySeason(data, resolveHistoricDriver(data, 'Hamilton'))
    expect(seasons[0]!.year).toBe(2007)
    expect(seasons.filter((s) => s.champion)).toHaveLength(7)
    const winners = circuitWinners(data, resolveCircuit(data, 'Monza'))
    expect(winners[0]!.year).toBeGreaterThanOrEqual(2025)
    expect(winners.find((w) => w.year === 2025)?.driver).toBe(
      resolveHistoricDriver(data, 'Max Verstappen'),
    )
  })
})

describe('history engine and tools', () => {
  const ctx = createTestContext()
  const calls = (text: string) => {
    const plan = parse(text, loadMeta(), ctx.state)
    return plan.kind === 'calls' ? plan.calls : plan.kind
  }

  it('understands history questions', () => {
    expect(calls('Senna vs Prost')).toEqual([
      { tool: 'head_to_head', input: { driverA: 'senna', driverB: 'prost' } },
    ])
    expect(calls('Hamilton vs Verstappen career')).toEqual([
      { tool: 'head_to_head', input: { driverA: 'hamilton', driverB: 'verstappen' } },
    ])
    expect(calls('Who has the most wins at Monza?')).toEqual([
      { tool: 'query_history', input: { stat: 'wins', circuit: 'monza' } },
    ])
    expect(calls('Most poles since 2010')).toEqual([
      { tool: 'query_history', input: { stat: 'poles', from: 2010 } },
    ])
    expect(calls('most wins in the 90s')).toEqual([
      { tool: 'query_history', input: { stat: 'wins', from: 1990, to: 1999 } },
    ])
    expect(calls("Michael Schumacher's career")).toEqual([
      { tool: 'get_driver_career', input: { driver: 'michael schumacher' } },
    ])
    expect(calls('Who won at Monza?')).toEqual([
      { tool: 'circuit_history', input: { circuit: 'monza' } },
    ])
  })

  it('keeps session questions on session tools', () => {
    expect((calls('Leclerc vs Hamilton at Ascari') as { tool: string }[])[0]!.tool).toBe(
      'compare_laps',
    )
    expect((calls('who got pole') as { tool: string }[])[0]!.tool).toBe('get_results')
  })

  it('runs a head-to-head and opens the History Explorer', async () => {
    const [outcome] = await runCalls(
      [{ tool: 'head_to_head', input: { driverA: 'Senna', driverB: 'Prost' } }],
      ctx,
    )
    expect(outcome!.result!.text).toMatch(/Ayrton Senna: 3 titles/)
    expect(outcome!.result!.text).toMatch(/As teammates/)
    expect(ctx.state.view).toBe('history')
  })

  it('answers career and circuit questions', async () => {
    const [career] = await runCalls(
      [{ tool: 'get_driver_career', input: { driver: 'Hamilton' } }],
      ctx,
    )
    expect(career!.result!.text).toMatch(/World champion 2008, 2014/)
    const [circuit] = await runCalls([{ tool: 'circuit_history', input: {} }], ctx)
    expect(circuit!.result!.text).toMatch(/^Monza: \d+ Grands Prix/)
    expect(ctx.state.view).toBe('circuits')
    expect(ctx.archive.circuit).toBe('monza')
  })

  it('opens rankings in the Record Book, with the years as an era', async () => {
    await runCalls([{ tool: 'query_history', input: { stat: 'poles', from: 2010 } }], ctx)
    expect(ctx.state.view).toBe('records')
    expect(ctx.archive).toMatchObject({
      board: 'poles',
      era: expect.stringMatching(/^2010-\d{4}$/),
    })
  })
})
