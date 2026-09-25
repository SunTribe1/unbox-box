import { describe, expect, it } from 'vitest'
import { pickSession } from '../src/lib/pick-session'

const index = [
  { id: '2026-azerbaijan-grand-prix-q', session: 'Qualifying' },
  { id: '2026-italian-grand-prix-r', session: 'Race' },
  { id: '2026-italian-grand-prix-q', session: 'Qualifying' },
]

describe('pickSession', () => {
  it('opens the session a link names', () => {
    expect(pickSession(index, { sessionId: '2026-italian-grand-prix-q', view: 'replay' })).toBe(
      '2026-italian-grand-prix-q',
    )
  })

  it('opens the latest race for the replay and strategy views', () => {
    expect(pickSession(index, { view: 'replay' })).toBe('2026-italian-grand-prix-r')
    expect(pickSession(index, { view: 'strategy' })).toBe('2026-italian-grand-prix-r')
  })

  it('opens the latest session for every other view', () => {
    expect(pickSession(index, { view: 'lap-duel' })).toBe('2026-azerbaijan-grand-prix-q')
    expect(pickSession(index, {})).toBe('2026-azerbaijan-grand-prix-q')
  })

  it('falls back to the latest session when no race exists yet', () => {
    expect(pickSession(index.slice(0, 1), { view: 'replay' })).toBe('2026-azerbaijan-grand-prix-q')
    expect(pickSession([], {})).toBeUndefined()
  })
})
