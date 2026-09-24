import { describe, expect, it } from 'vitest'
import { findSession, groupSessions, matchSessions, type SessionSummary } from '../src'

const s = (
  season: number,
  round: number,
  event: string,
  session: string,
  circuit: string,
  country: string,
  date: string,
): SessionSummary => {
  const short: Record<string, string> = {
    Qualifying: 'q',
    Race: 'r',
    Sprint: 's',
    'Sprint Qualifying': 'sq',
  }
  const slug = event
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
  return {
    id: `${season}-${slug}-${short[session]}`,
    season,
    round,
    event,
    session,
    date,
    circuit,
    country,
  }
}

// Newest first, as the pipeline writes it.
const INDEX: SessionSummary[] = [
  s(2025, 16, 'Italian Grand Prix', 'Race', 'Autodromo Nazionale Monza', 'Italy', '2025-09-07'),
  s(
    2025,
    16,
    'Italian Grand Prix',
    'Qualifying',
    'Autodromo Nazionale Monza',
    'Italy',
    '2025-09-06',
  ),
  s(2025, 8, 'Monaco Grand Prix', 'Race', 'Circuit de Monaco', 'Monaco', '2025-05-25'),
  s(2025, 8, 'Monaco Grand Prix', 'Qualifying', 'Circuit de Monaco', 'Monaco', '2025-05-24'),
  s(2024, 21, 'São Paulo Grand Prix', 'Race', 'Autódromo José Carlos Pace', 'Brazil', '2024-11-03'),
  s(
    2024,
    21,
    'São Paulo Grand Prix',
    'Sprint',
    'Autódromo José Carlos Pace',
    'Brazil',
    '2024-11-02',
  ),
  s(
    2024,
    21,
    'São Paulo Grand Prix',
    'Sprint Qualifying',
    'Autódromo José Carlos Pace',
    'Brazil',
    '2024-11-01',
  ),
  s(
    2024,
    16,
    'Italian Grand Prix',
    'Qualifying',
    'Autodromo Nazionale Monza',
    'Italy',
    '2024-08-31',
  ),
  s(2024, 8, 'Monaco Grand Prix', 'Race', 'Circuit de Monaco', 'Monaco', '2024-05-26'),
  s(2024, 8, 'Monaco Grand Prix', 'Qualifying', 'Circuit de Monaco', 'Monaco', '2024-05-25'),
  s(
    2024,
    6,
    'Miami Grand Prix',
    'Race',
    'Miami International Autodrome',
    'United States',
    '2024-05-05',
  ),
  s(
    2023,
    18,
    'United States Grand Prix',
    'Race',
    'Circuit of the Americas',
    'United States',
    '2023-10-22',
  ),
]
const CURRENT = '2025-italian-grand-prix-q'

describe('findSession', () => {
  it('switches event and year, keeping the current session type', () => {
    expect(findSession('Leclerc vs Sainz Monaco 2024', INDEX, CURRENT)?.id).toBe(
      '2024-monaco-grand-prix-q',
    )
  })

  it('reads the session type', () => {
    expect(findSession('show me the 2024 Monaco race', INDEX, CURRENT)?.id).toBe(
      '2024-monaco-grand-prix-r',
    )
    expect(findSession('Brazil 2024 sprint shootout', INDEX, CURRENT)?.id).toBe(
      '2024-sao-paulo-grand-prix-sq',
    )
    expect(findSession('interlagos sprint', INDEX, CURRENT)?.id).toBe('2024-sao-paulo-grand-prix-s')
  })

  it('uses the latest season when only the event is named', () => {
    expect(findSession('monaco quali', INDEX, CURRENT)?.id).toBe('2025-monaco-grand-prix-q')
  })

  it('keeps the current event when only the year is named', () => {
    expect(findSession('Norris vs Piastri 2024', INDEX, CURRENT)?.id).toBe(
      '2024-italian-grand-prix-q',
    )
  })

  it('understands nicknames and falls back to an available session type', () => {
    expect(findSession('COTA 2023', INDEX, CURRENT)?.id).toBe('2023-united-states-grand-prix-r')
  })

  it('does not treat team or everyday words as events', () => {
    expect(findSession('Red Bull vs Ferrari', INDEX, CURRENT)).toBeNull()
    expect(findSession('Where did Norris lose time?', INDEX, CURRENT)).toBeNull()
    expect(findSession("Piastri's Q2 lap vs his Q3 lap", INDEX, CURRENT)).toBeNull()
  })

  it('returns null when the request is the current session', () => {
    expect(findSession('Monza 2025 qualifying', INDEX, CURRENT)).toBeNull()
  })

  it('reports what it matched so the rest of the question can be parsed alone', () => {
    const hit = findSession('Leclerc vs Sainz at Monaco 2024', INDEX, CURRENT)
    expect(hit?.rest).toBe('Leclerc vs Sainz')
  })
})

describe('matchSessions', () => {
  it('filters by any combination of season, event and session', () => {
    expect(matchSessions(INDEX, { event: 'monaco' }).map((x) => x.id)).toEqual([
      '2025-monaco-grand-prix-r',
      '2025-monaco-grand-prix-q',
      '2024-monaco-grand-prix-r',
      '2024-monaco-grand-prix-q',
    ])
    expect(matchSessions(INDEX, { season: 2024, session: 'race' }).map((x) => x.id)).toEqual([
      '2024-sao-paulo-grand-prix-r',
      '2024-monaco-grand-prix-r',
      '2024-miami-grand-prix-r',
    ])
  })
})

describe('groupSessions', () => {
  it('groups by season and round, newest first, sessions in weekend order', () => {
    const groups = groupSessions(INDEX)
    expect(groups.map((g) => g.season)).toEqual([2025, 2024, 2023])
    const brazil = groups[1]!.events[0]!
    expect(brazil.event).toBe('São Paulo Grand Prix')
    expect(brazil.sessions.map((x) => x.session)).toEqual(['Sprint Qualifying', 'Sprint', 'Race'])
  })
})
