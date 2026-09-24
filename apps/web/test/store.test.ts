import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_TRACES, useApp } from '../src/lib/store'

const initial = useApp.getState()

describe('app store', () => {
  beforeEach(() => useApp.setState(initial, true))

  it('clears session-bound state when the session changes', () => {
    const app = useApp.getState()
    app.setDuel({ a: 'NOR', b: 'PIA', lapA: 10, lapB: 12 })
    app.setCorner(4)
    app.setStrategy({ simLap: 20 })
    app.setSession('2025-italian-grand-prix-r')
    expect(useApp.getState()).toMatchObject({ duel: null, corner: null, strategy: {} })
  })

  it('swaps the duel drivers with their laps', () => {
    useApp.getState().setDuel({ a: 'NOR', b: 'PIA', lapA: 10, lapB: 12 })
    useApp.getState().swapDuel()
    expect(useApp.getState().duel).toEqual({ a: 'PIA', b: 'NOR', lapA: 12, lapB: 10 })
  })

  it('remembers the view before Help, for bug reports', () => {
    useApp.getState().setView('replay')
    useApp.getState().setView('help')
    useApp.getState().setView('help')
    expect(useApp.getState().lastView).toBe('replay')
  })

  it('merges history and archive updates without mutating the old state', () => {
    const before = useApp.getState().archive
    useApp.getState().setArchive({ season: 1988 })
    useApp.getState().setArchive({ round: 3 })
    expect(useApp.getState().archive).toEqual({ season: 1988, round: 3 })
    expect(before).toEqual({})
    useApp.getState().setHistory({ tab: 'drivers' })
    useApp.getState().setHistory({ driver: 'ayrton-senna' })
    expect(useApp.getState().history).toEqual({ tab: 'drivers', driver: 'ayrton-senna' })
  })

  it('appends and updates chat messages by id', () => {
    const app = useApp.getState()
    app.pushMessage({ id: 'm1', role: 'user', text: 'hi' })
    app.pushMessage({ id: 'm2', role: 'user', text: 'there' })
    app.updateMessage('m1', (m) => ({ ...m, text: 'hello' }) as typeof m)
    expect(useApp.getState().messages.map((m) => ('text' in m ? m.text : ''))).toEqual([
      'hello',
      'there',
    ])
  })

  it('starts with the default traces', () => {
    expect(useApp.getState().traces).toEqual(DEFAULT_TRACES)
  })
})
