import type { SessionMeta } from '../data/schema'
import type { ToolCall } from '../agent/run'
import { sessionSuggestions } from './suggest'
import { findCorner, findDrivers, findTraces, has, lapRefs, normalize } from './entities'
import { parseHistory, parseReplay, parseStrategy } from './intents'
import type { AppStateSnapshot } from '../tools/types'

/**
 * The built-in command engine: turns plain-English questions into tool calls with no AI,
 * no network and no setup. Deterministic, instant and unit-tested. It covers the common
 * question shapes; anything else gets a suggestion instead of a guess.
 */

export type EnginePlan =
  | { kind: 'calls'; calls: ToolCall[] }
  | { kind: 'help'; text: string; suggestions: string[] }
  | { kind: 'unknown'; text: string; suggestions: string[] }

export const SUGGESTIONS = [
  'Where did Norris lose time to Verstappen?',
  'Compare Leclerc and Hamilton',
  'Show me the Parabolica',
  'Who was fastest in sector 2?',
  'Watch the race at 16x',
  "Piastri's Q2 lap vs his Q3 lap",
]

export const REPLAY_SUGGESTIONS = [
  'Play at 16x',
  'Who was leading on lap 30?',
  'When did Norris pit?',
  'Jump to the last lap',
  'Show the penalties',
  'Compare Verstappen and Norris',
]

export const STRATEGY_SUGGESTIONS = [
  'What if Norris pitted on lap 30 for hards?',
  'Could Piastri undercut Norris on lap 20?',
  'How fast did the tyres degrade?',
  "Show Leclerc's tyre strategy",
  'Show all tyre strategies',
  'Play the race at 16x',
]

export const HISTORY_SUGGESTIONS = [
  'Senna vs Prost',
  'Hamilton vs Verstappen career',
  'Who has the most wins at Monza?',
  'Most poles since 2010',
  "Michael Schumacher's career",
  'Who won at Monza?',
]

/** Archive views ask about all-time history, whatever session is loaded. */
const ARCHIVE_VIEWS = new Set<AppStateSnapshot['view']>(['races', 'records', 'engines', 'nations'])

/** Example questions for a view. With a session loaded they're built from its drivers and
 *  corners (see suggest.ts); the fixed lists are the fallback before data arrives. */
export function suggestionsFor(view: AppStateSnapshot['view'], meta?: SessionMeta): string[] {
  if (ARCHIVE_VIEWS.has(view)) return HISTORY_SUGGESTIONS
  if (meta) return sessionSuggestions(view, meta)
  if (view === 'history') return HISTORY_SUGGESTIONS
  if (view === 'replay') return REPLAY_SUGGESTIONS
  if (view === 'strategy') return STRATEGY_SUGGESTIONS
  return SUGGESTIONS
}

export function parse(raw: string, meta: SessionMeta, state: AppStateSnapshot): EnginePlan {
  const text = normalize(raw)
  if (!text || has(text, /^(help|\?)$|what can (you|i) (do|ask)|how does this work/)) {
    return {
      kind: 'help',
      text: 'Ask me about this session in plain English. I can compare laps, explain where time was won or lost, zoom into corners, rank sectors, run the race replay and test strategy what-ifs.',
      suggestions: suggestionsFor(state.view, meta),
    }
  }

  const drivers = findDrivers(raw, meta)
  const strategyCalls = parseStrategy(text, drivers, state)
  if (strategyCalls) return { kind: 'calls', calls: strategyCalls }
  const historyCalls = parseHistory(text, drivers)
  if (historyCalls) return { kind: 'calls', calls: historyCalls }
  const view = /\b(strategy|history)\b/.exec(text)
  if (view && has(text, /\b(open|show|go|switch|view)\b/)) {
    return { kind: 'calls', calls: [{ tool: 'open_view', input: { view: view[1] } }] }
  }
  if (has(text, /\b(sessions|which races|what data|what sessions)\b/)) {
    return { kind: 'calls', calls: [{ tool: 'list_sessions', input: {} }] }
  }

  const replayCalls = parseReplay(text, drivers, meta, state)
  if (replayCalls) return { kind: 'calls', calls: replayCalls }
  const corner = findCorner(raw, meta)
  const refs = lapRefs(text)
  const sector = /\b(?:sector|s)\s*([123])\b/.exec(text)
  const wantsRanking = has(
    text,
    /\b(who|fastest|quickest|pole|top \d+|results?|classification|standings|leaderboard|order|ranking|speed trap|top speeds)\b/,
  )
  const wantsStats = has(text, /\b(stats|statistics|top speed|how fast|full throttle|drs)\b/)
  const pole = meta.results[0]?.driver
  const second = meta.results[1]?.driver

  // One driver, two segments or laps: compare the driver with themselves.
  if (drivers.length === 1 && refs.length >= 2) {
    const d = drivers[0]!
    return {
      kind: 'calls',
      calls: [
        { tool: 'compare_laps', input: { driverA: d, driverB: d, lapA: refs[0], lapB: refs[1] } },
        { tool: 'explain_gap', input: {} },
      ],
    }
  }

  if (drivers.length >= 2 || (drivers.length === 1 && !wantsStats)) {
    const a = drivers[0]!
    const b = drivers[1] ?? (a === pole ? second : pole)
    if (!b) return unknown(state, meta)
    // "Where did NOR lose time to VER": the reference (A) is the second driver named.
    const loserFirst = drivers.length >= 2 && has(text, /\b(lose|lost|losing|slower|behind)\b/)
    const [first, other] = loserFirst ? [b, a] : [a, b]
    const calls: ToolCall[] = [
      {
        tool: 'compare_laps',
        input: {
          driverA: first,
          driverB: other,
          ...(refs[0] !== undefined ? { lapA: refs[0] } : {}),
          ...(refs[1] !== undefined ? { lapB: refs[1] } : {}),
        },
      },
    ]
    if (corner != null) {
      calls.push({ tool: 'highlight_corner', input: { corner } })
      calls.push({ tool: 'corner_report', input: { corner } })
    } else {
      calls.push({ tool: 'explain_gap', input: {} })
    }
    return { kind: 'calls', calls }
  }

  if (drivers.length === 1 && wantsStats) {
    return {
      kind: 'calls',
      calls: [
        {
          tool: 'get_lap_stats',
          input: { driver: drivers[0], ...(refs[0] ? { lap: refs[0] } : {}) },
        },
      ],
    }
  }

  if (corner != null) {
    return {
      kind: 'calls',
      calls: [
        { tool: 'highlight_corner', input: { corner } },
        { tool: 'corner_report', input: { corner } },
      ],
    }
  }

  if (wantsRanking || sector) {
    const metric = sector
      ? `s${sector[1]}`
      : has(text, /\b(speed trap|top speeds?|straight.?line)\b/)
        ? 'speedTrap'
        : 'lap'
    const top = /\btop (\d+)\b/.exec(text)
    const limit = top
      ? Math.min(20, Number(top[1]))
      : has(text, /\b(pole|fastest|quickest)\b/) && !sector && metric === 'lap'
        ? 3
        : 10
    return { kind: 'calls', calls: [{ tool: 'get_results', input: { metric, limit } }] }
  }

  const traces = findTraces(text)
  if (traces.length && has(text, /\b(show|only|hide|display|plot|add)\b/)) {
    const next = has(text, /\bonly\b/)
      ? traces
      : has(text, /\bhide\b/)
        ? state.traces.filter((t) => !traces.includes(t))
        : [...new Set([...state.traces, ...traces])]
    return {
      kind: 'calls',
      calls: [{ tool: 'set_traces', input: { traces: next.length ? next : ['delta', 'speed'] } }],
    }
  }

  if (has(text, /\b(why|where|explain|difference|gap)\b/)) {
    return { kind: 'calls', calls: [{ tool: 'explain_gap', input: {} }] }
  }

  return unknown(state, meta)
}

function unknown(state: AppStateSnapshot, meta: SessionMeta): EnginePlan {
  return {
    kind: 'unknown',
    text: 'I didn’t catch that. I understand questions about drivers, laps, corners, sectors, speed traps and the race replay. Try one of these:',
    suggestions: suggestionsFor(state.view, meta).slice(0, 4),
  }
}
