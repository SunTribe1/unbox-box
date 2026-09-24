import type { SessionMeta } from '../data/schema'
import type { ToolCall } from '../agent/run'
import { sessionSuggestions } from './suggest'
import { TRACES, type AppStateSnapshot, type Trace } from '../tools/types'
import { stripAccents } from '../util/text'

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

/** Example questions for a view. With a session loaded they're built from its drivers and
 *  corners (see suggest.ts); the fixed lists are the fallback before data arrives. */
/** Archive views ask about all-time history, whatever session is loaded. */
const ARCHIVE_VIEWS = new Set<AppStateSnapshot['view']>(['races', 'records', 'engines', 'nations'])

export function suggestionsFor(view: AppStateSnapshot['view'], meta?: SessionMeta): string[] {
  if (ARCHIVE_VIEWS.has(view)) return HISTORY_SUGGESTIONS
  if (meta) return sessionSuggestions(view, meta)
  if (view === 'history') return HISTORY_SUGGESTIONS
  if (view === 'replay') return REPLAY_SUGGESTIONS
  if (view === 'strategy') return STRATEGY_SUGGESTIONS
  return SUGGESTIONS
}

// Driver codes that are also English words; they only count when typed in capitals.
const AMBIGUOUS_CODES = new Set(['had', 'nor', 'gas', 'law', 'col', 'ant', 'str', 'sai', 'alo'])

function normalize(text: string): string {
  return stripAccents(text)
    .toLowerCase()
    .replace(/[’']s\b/g, '')
    .replace(/[^a-z0-9#\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

interface Mention {
  code: string
  at: number
}

export function findDrivers(raw: string, meta: SessionMeta): string[] {
  const text = ` ${normalize(raw)} `
  const mentions: Mention[] = []
  const add = (code: string, at: number) => {
    if (at >= 0) mentions.push({ code, at })
  }
  const wordAt = (word: string) => {
    const match = new RegExp(`[\\s#]${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s.])`).exec(
      text,
    )
    return match ? match.index : -1
  }

  for (const d of meta.drivers) {
    const last = normalize(d.lastName)
    add(d.code, wordAt(last))
    for (const first of normalize(d.firstName).split(' ')) {
      // "max" followed by "speed" is not Max Verstappen.
      const at = wordAt(first)
      if (first === 'max' && /\bmax(imum)?\s+speed/.test(text)) continue
      add(d.code, at)
    }
    const code = d.code.toLowerCase()
    if (!AMBIGUOUS_CODES.has(code) || new RegExp(`\\b${d.code}\\b`).test(raw))
      add(d.code, wordAt(code))
    const car = new RegExp(`(?:#|car\\s*(?:number\\s*)?)${d.number}\\b`).exec(text)
    if (car) add(d.code, car.index)
  }

  mentions.sort((x, y) => x.at - y.at)
  return [...new Set(mentions.map((m) => m.code))]
}

export function findCorner(raw: string, meta: SessionMeta): number | null {
  const text = normalize(raw)
  const numbered = /\b(?:t|turn|corner)\s*(\d{1,2})\b/.exec(text)
  if (numbered) {
    const n = Number(numbered[1])
    if (meta.circuit.corners.some((c) => c.number === n)) return n
  }
  const aliases = Object.entries(meta.circuit.aliases).sort((x, y) => y[0].length - x[0].length)
  for (const [alias, corner] of aliases) {
    if (new RegExp(`\\b${alias}\\b`).test(text)) return corner
  }
  for (const corner of meta.circuit.corners) {
    if (corner.name && text.includes(normalize(corner.name))) return corner.number
  }
  return null
}

function findTraces(text: string): Trace[] {
  const words: Record<string, Trace> = {
    delta: 'delta',
    gap: 'delta',
    speed: 'speed',
    throttle: 'throttle',
    brake: 'brake',
    braking: 'brake',
    gear: 'gear',
    gears: 'gear',
    rpm: 'rpm',
    revs: 'rpm',
  }
  const found = new Set<Trace>()
  for (const [word, trace] of Object.entries(words)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) found.add(trace)
  }
  return TRACES.filter((t) => found.has(t))
}

function lapRefs(text: string): (number | 'Q1' | 'Q2' | 'Q3')[] {
  const refs: { at: number; ref: number | 'Q1' | 'Q2' | 'Q3' }[] = []
  for (const m of text.matchAll(/\bq([123])\b/g))
    refs.push({ at: m.index, ref: `Q${m[1]}` as 'Q1' })
  for (const m of text.matchAll(/\blap\s*(\d{1,2})\b/g))
    refs.push({ at: m.index, ref: Number(m[1]) })
  return refs.sort((x, y) => x.at - y.at).map((r) => r.ref)
}

const has = (text: string, pattern: RegExp) => pattern.test(text)

const SPEEDS = [1, 4, 16, 64] as const

function nearestSpeed(n: number): (typeof SPEEDS)[number] {
  return SPEEDS.reduce((best, s) => (Math.abs(s - n) < Math.abs(best - n) ? s : best), SPEEDS[0])
}

function findCompound(text: string): 'SOFT' | 'MEDIUM' | 'HARD' | null {
  if (/\bhards?\b|\bhard tyres?\b/.test(text)) return 'HARD'
  if (/\bmediums?\b/.test(text)) return 'MEDIUM'
  if (/\bsofts?\b/.test(text)) return 'SOFT'
  return null
}

const HISTORY_WORDS =
  /\b(career|all.?time|ever|history|historic|head.?to.?head|h2h|titles?|championships?|world champions?|records?|greatest|goat|legends?)\b/

/** Constructors people ask about by name; the tool resolves the exact team. */
const TEAM_WORDS =
  /\b(ferrari|mercedes|mclaren|red bull|williams|lotus|brabham|tyrrell|benetton|renault|alpine|aston martin|jordan|sauber|haas|toro rosso|racing bulls|alphatauri|force india|racing point|brawn|toyota|honda|bmw sauber|cooper|maserati|vanwall|ligier|march|minardi|jaguar|stewart|arrows|matra|kick sauber|audi|cadillac)\b/

const STAT_WORDS: [RegExp, string][] = [
  [/\b(wins|victories|race wins)\b/, 'wins'],
  [/\b(poles?|pole positions)\b/, 'poles'],
  [/\bpodiums?\b/, 'podiums'],
  [/\b(titles|championships|world titles|world championships)\b/, 'titles'],
  [/\b(starts|races|entries)\b/, 'starts'],
  [/\bfastest laps\b/, 'fastestLaps'],
  [/\bpoints\b/, 'points'],
]

const NAME_NOISE = new Set(
  (
    'how many much did does do has have had win wins won title titles pole poles podium podiums ' +
    'career careers stats statistics record records of the what was is whats tell me about show ' +
    'all time ever in his her total f1 formula one and a an get who better best greatest head to ' +
    'h2h compare comparison vs versus against or history historic s their between'
  ).split(' '),
)

function cleanName(text: string): string | null {
  const words = text
    .replace(/[?.!]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !NAME_NOISE.has(w))
  return words.length ? words.join(' ') : null
}

function period(text: string): { from?: number; to?: number } {
  const between = /\bbetween (\d{4}) and (\d{4})\b/.exec(text)
  if (between) return { from: Number(between[1]), to: Number(between[2]) }
  const decade = /\b(?:in )?the (\d{2}|\d{4})s\b/.exec(text)
  if (decade) {
    const d = decade[1]!
    const start = d.length === 2 ? (Number(d) >= 50 ? 1900 : 2000) + Number(d) : Number(d)
    return { from: start, to: start + 9 }
  }
  const since = /\bsince (\d{4})\b/.exec(text)
  if (since) return { from: Number(since[1]) }
  const inYear = /\bin (\d{4})\b/.exec(text)
  if (inYear) return { from: Number(inYear[1]), to: Number(inYear[1]) }
  return {}
}

/** History intents: head-to-heads, all-time records, careers, circuit winners. */
function parseHistory(text: string, drivers: string[]): ToolCall[] | null {
  const historic = HISTORY_WORDS.test(text)
  const at = /\bat ([a-z][a-z ]+?)(?:\s+(?:since|in|between|before|after)\b|\s*$)/.exec(text)
  const circuit = at?.[1]?.replace(/^the /, '').trim()

  const most = /\b(?:most|record for|all.?time leaders?)\b/.test(text)
  const stat = STAT_WORDS.find(([re]) => re.test(text))?.[1]
  if (most && stat) {
    return [
      { tool: 'query_history', input: { stat, ...period(text), ...(circuit ? { circuit } : {}) } },
    ]
  }
  if (/\b(world champions|list of champions|all champions)\b/.test(text)) {
    return [{ tool: 'query_history', input: { stat: 'titles', limit: 20 } }]
  }
  if (/\b(who won|winners?|past winners|previous winners)\b/.test(text) && circuit) {
    return [{ tool: 'circuit_history', input: { circuit } }]
  }
  if (
    /\b(won here before|past winners|history of this (race|track|circuit)|track history|circuit history)\b/.test(
      text,
    )
  ) {
    return [{ tool: 'circuit_history', input: {} }]
  }

  const versus = /^(.+?)\s+(?:vs\.?|versus|against|or)\s+(.+?)$/.exec(text)
  const lapTalk = /\b(q[123]|lap|laps|sector|corner|turn)\b/.test(text)
  if (versus && (historic || (drivers.length < 2 && !lapTalk))) {
    const a = cleanName(versus[1]!)
    const b = cleanName(versus[2]!)
    if (a && b) return [{ tool: 'head_to_head', input: { driverA: a, driverB: b } }]
  }

  // "2021 championship", "the 2008 title fight", "constructors standings 1998"
  const year = /\b(19[5-9]\d|20\d{2})\b/.exec(text)?.[1]
  if (year && /\b(championship|title|standings|season|title fight|title race)\b/.test(text)) {
    const kind = /\b(constructors?|teams?)\b/.test(text) ? 'constructors' : 'drivers'
    return [{ tool: 'championship', input: { season: Number(year), kind } }]
  }

  // "Ferrari history", "tell me about McLaren", "Williams team profile"
  const team = TEAM_WORDS.exec(text)?.[0]
  if (team && /\b(history|story|profile|about|titles?|team|record)\b/.test(text)) {
    return [{ tool: 'team_profile', input: { team } }]
  }

  // "Alonso profile", "tell me about Jim Clark"
  const about = /\b(?:profile(?: of| for)?|tell me about)\s+(.+)$/.exec(text)
  const profileOf = /^(.+?)\s+profile$/.exec(text)
  const who = cleanName(about?.[1] ?? profileOf?.[1] ?? '')
  if (who && (about || profileOf)) return [{ tool: 'driver_profile', input: { driver: who } }]

  const careerAsk =
    /\b(career|stats|statistics)\b/.test(text) ||
    /\bhow many (wins|titles|championships|poles|podiums|races|starts)\b/.test(text)
  if (careerAsk) {
    const name = cleanName(text)
    if (name) return [{ tool: 'get_driver_career', input: { driver: name } }]
  }
  return null
}

/** Strategy intents: what-if pit stops, undercuts, degradation, tyre stints. */
function parseStrategy(
  text: string,
  drivers: string[],
  state: AppStateSnapshot,
): ToolCall[] | null {
  const lap = /\blap\s*(\d{1,2})\b/.exec(text)
  const tyre = findCompound(text)
  if (has(text, /\bundercut\b/) && drivers.length >= 2) {
    return [
      {
        tool: 'undercut_check',
        input: {
          attacker: drivers[0],
          defender: drivers[1],
          lap: lap ? Number(lap[1]) : 20,
          ...(tyre ? { compound: tyre } : {}),
        },
      },
    ]
  }
  const whatIf = has(
    text,
    /\bwhat if\b|\bhad (pitted|stopped)\b|\bsimulat\w*\b|\bif \w+ (pitted|stopped|boxed)\b/,
  )
  if (whatIf && drivers.length >= 1 && lap) {
    return [
      {
        tool: 'simulate_pit_stop',
        input: { driver: drivers[0], lap: Number(lap[1]), compound: tyre ?? 'HARD' },
      },
    ]
  }
  if (
    has(text, /\b(degradation|degrade\w*|deg|drop.?off|tyre wear|tire wear|fuel effect|pit loss)\b/)
  ) {
    return [{ tool: 'get_degradation', input: {} }]
  }
  if (has(text, /\b(strateg\w*|stints?)\b/) && !has(text, /\b(open|go to|switch)\b/)) {
    return [{ tool: 'get_stints', input: drivers[0] ? { driver: drivers[0] } : {} }]
  }
  if (state.view === 'strategy' && drivers.length === 1 && lap) {
    return [
      {
        tool: 'simulate_pit_stop',
        input: { driver: drivers[0], lap: Number(lap[1]), compound: tyre ?? 'HARD' },
      },
    ]
  }
  return null
}

/** Replay intents: play/pause, seeking, race order, pit stops, race control. */
function parseReplay(
  text: string,
  drivers: string[],
  meta: SessionMeta,
  state: AppStateSnapshot,
): ToolCall[] | null {
  const inReplay = state.view === 'replay'
  const raceWords = has(text, /\b(replay|race|watch|playback|grand prix)\b/)
  const lap = /\blap\s*(\d{1,2})\b/.exec(text)
  const speed = /\b(\d{1,2})\s*(x|times)\b|×\s*(\d{1,2})/.exec(text)

  if (has(text, /\b(pause|stop|freeze)\b/) && (inReplay || raceWords)) {
    return [{ tool: 'replay_play', input: { playing: false } }]
  }
  if (has(text, /\b(play|resume|watch|run)\b/) && (inReplay || raceWords || speed)) {
    const n = speed ? Number(speed[1] ?? speed[3]) : null
    const faster = has(text, /\bfaster\b/)
      ? SPEEDS[
          Math.min(
            SPEEDS.indexOf(state.playback.speed as (typeof SPEEDS)[number]) + 1,
            SPEEDS.length - 1,
          )
        ]
      : null
    return [
      {
        tool: 'replay_play',
        input: {
          playing: true,
          ...(n ? { speed: nearestSpeed(n) } : faster ? { speed: faster } : {}),
        },
      },
    ]
  }
  if (has(text, /\bfaster\b|\bslower\b/) && inReplay) {
    const i = SPEEDS.indexOf(state.playback.speed as (typeof SPEEDS)[number])
    const next =
      SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, i + (has(text, /\bfaster\b/) ? 1 : -1)))]
    return [{ tool: 'replay_play', input: { playing: state.playback.playing, speed: next } }]
  }
  if (has(text, /\b(pit ?stops?|pitted|pit)\b/)) {
    return [{ tool: 'get_pit_stops', input: drivers[0] ? { driver: drivers[0] } : {} }]
  }
  if (has(text, /\b(race control|penalt\w*|investigat\w*|incidents?|flags?|stewards?)\b/)) {
    const filter = has(text, /penalt|stewards|investigat/)
      ? 'penalties'
      : has(text, /incident/)
        ? 'incidents'
        : has(text, /flag/)
          ? 'flags'
          : 'all'
    return [
      { tool: 'get_race_control', input: { filter, ...(lap ? { lap: Number(lap[1]) } : {}) } },
    ]
  }
  const orderWords = has(
    text,
    /\b(leading|led|lead|leader|order|standings|positions?|running|p1|in front|top \d+)\b/,
  )
  if (
    orderWords &&
    (meta.replay || inReplay) &&
    drivers.length < 2 &&
    (lap || inReplay || raceWords)
  ) {
    return [{ tool: 'get_race_order', input: lap ? { lap: Number(lap[1]) } : {} }]
  }
  if (has(text, /\b(the start|lights out|race start|beginning)\b/) && (inReplay || raceWords)) {
    return [{ tool: 'replay_seek', input: { moment: 'start' } }]
  }
  if (
    has(text, /\b(last lap|final lap|the finish|chequered|checkered)\b/) &&
    (inReplay || raceWords)
  ) {
    return [
      {
        tool: 'replay_seek',
        input: has(text, /finish|chequered|checkered/) ? { moment: 'finish' } : { lap: 999 },
      },
    ]
  }
  if (lap && drivers.length < 2 && (inReplay || raceWords)) {
    return [{ tool: 'replay_seek', input: { lap: Number(lap[1]) } }]
  }
  if (raceWords && has(text, /\b(open|show|go|replay)\b/) && drivers.length === 0) {
    return [{ tool: 'open_view', input: { view: 'replay' } }]
  }
  return null
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
