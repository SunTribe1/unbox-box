import type { ToolCall } from '../agent/run'
import type { SessionMeta } from '../data/schema'
import type { AppStateSnapshot } from '../tools/types'
import {
  HISTORY_WORDS,
  SPEEDS,
  STAT_WORDS,
  TEAM_WORDS,
  cleanName,
  findCompound,
  has,
  nearestSpeed,
  period,
} from './entities'

/** Intent parsers for the command engine: history, strategy and replay questions. Each
 *  returns tool calls, or null when the question isn't its kind. */

/** History intents: head-to-heads, all-time records, careers, circuit winners. */
export function parseHistory(text: string, drivers: string[]): ToolCall[] | null {
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
export function parseStrategy(
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
export function parseReplay(
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
