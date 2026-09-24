import { describe, expect, it } from 'vitest'
import { findCorner, findDrivers, parse, suggestionsFor } from '../src'
import { createTestContext, loadMeta, RACE_ID } from './context'

const meta = loadMeta()
const state = createTestContext().state
const calls = (text: string) => {
  const plan = parse(text, meta, state)
  return plan.kind === 'calls' ? plan.calls : plan.kind
}

describe('findDrivers', () => {
  it('finds names, first names, codes and numbers in order', () => {
    expect(findDrivers('Leclerc vs Max', meta)).toEqual(['LEC', 'VER'])
    expect(findDrivers('compare VER and NOR', meta)).toEqual(['VER', 'NOR'])
    expect(findDrivers('car #44 against oscar', meta)).toEqual(['HAM', 'PIA'])
    expect(findDrivers('Hülkenberg', meta)).toEqual(['HUL'])
  })

  it('ignores codes that are ordinary words', () => {
    expect(findDrivers('who had the best max speed nor the gas', meta)).toEqual([])
  })
})

describe('findCorner', () => {
  it('understands numbers and names', () => {
    expect(findCorner('show turn 11', meta)).toBe(11)
    expect(findCorner('T4 please', meta)).toBe(4)
    expect(findCorner('the Parabolica', meta)).toBe(11)
    expect(findCorner('second lesmo', meta)).toBe(7)
    expect(findCorner('variante ascari', meta)).toBe(8)
  })
})

describe('parse', () => {
  it('turns a where-did-X-lose question into compare + explain with the loser as B', () => {
    expect(calls('Where did Norris lose time to Verstappen?')).toEqual([
      { tool: 'compare_laps', input: { driverA: 'VER', driverB: 'NOR' } },
      { tool: 'explain_gap', input: {} },
    ])
  })

  it('compares one driver with pole, and pole with P2', () => {
    expect(calls('how did Hamilton do')).toEqual([
      { tool: 'compare_laps', input: { driverA: 'HAM', driverB: 'VER' } },
      { tool: 'explain_gap', input: {} },
    ])
    expect((calls('Verstappen') as { input: unknown }[])[0]).toEqual({
      tool: 'compare_laps',
      input: { driverA: 'VER', driverB: 'NOR' },
    })
  })

  it('compares a driver with themselves across segments', () => {
    expect(calls("Piastri's Q2 lap vs his Q3 lap")).toEqual([
      { tool: 'compare_laps', input: { driverA: 'PIA', driverB: 'PIA', lapA: 'Q2', lapB: 'Q3' } },
      { tool: 'explain_gap', input: {} },
    ])
  })

  it('handles corners, rankings and traces', () => {
    expect(calls('Show me the Parabolica')).toEqual([
      { tool: 'highlight_corner', input: { corner: 11 } },
      { tool: 'corner_report', input: { corner: 11 } },
    ])
    expect(calls('Who was fastest in sector 2?')).toEqual([
      { tool: 'get_results', input: { metric: 's2', limit: 10 } },
    ])
    expect(calls('Top speeds through the speed trap')).toEqual([
      { tool: 'get_results', input: { metric: 'speedTrap', limit: 10 } },
    ])
    expect(calls('who got pole')).toEqual([
      { tool: 'get_results', input: { metric: 'lap', limit: 3 } },
    ])
    expect(calls('show only speed and gear')).toEqual([
      { tool: 'set_traces', input: { traces: ['speed', 'gear'] } },
    ])
  })

  it('compares two drivers at a corner', () => {
    expect(calls('Leclerc vs Hamilton at Ascari')).toEqual([
      { tool: 'compare_laps', input: { driverA: 'LEC', driverB: 'HAM' } },
      { tool: 'highlight_corner', input: { corner: 8 } },
      { tool: 'corner_report', input: { corner: 8 } },
    ])
  })

  it('offers help and suggestions instead of guessing', () => {
    expect(parse('help', meta, state).kind).toBe('help')
    expect(parse('bake me a cake', meta, state).kind).toBe('unknown')
  })
})

describe('session suggestions', () => {
  const race = loadMeta(RACE_ID)
  const views = ['lap-duel', 'replay', 'strategy', 'history'] as const

  it('builds questions from the loaded session', () => {
    expect(suggestionsFor('lap-duel', meta)[0]).toBe('Where did Norris lose time to Verstappen?')
    expect(suggestionsFor('lap-duel', meta)).toContain('Show me the Curva Alboreto')
  })

  it.each(views)('every %s suggestion parses into tool calls', (view) => {
    const m = view === 'replay' || view === 'strategy' ? race : meta
    const s = { ...state, view, sessionId: m.id }
    for (const question of suggestionsFor(view, m)) {
      expect(parse(question, m, s).kind, question).toBe('calls')
    }
  })
})
