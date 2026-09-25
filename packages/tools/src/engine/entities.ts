import type { SessionMeta } from '../data/schema'
import { TRACES, type Trace } from '../tools/types'
import { stripAccents } from '../util/text'

/** Entity extraction for the command engine: drivers, corners, laps, traces, compounds and
 *  year ranges found in a plain-English question. */

// Driver codes that are also English words; they only count when typed in capitals.
const AMBIGUOUS_CODES = new Set(['had', 'nor', 'gas', 'law', 'col', 'ant', 'str', 'sai', 'alo'])

export function normalize(text: string): string {
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

export function findTraces(text: string): Trace[] {
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

export function lapRefs(text: string): (number | 'Q1' | 'Q2' | 'Q3')[] {
  const refs: { at: number; ref: number | 'Q1' | 'Q2' | 'Q3' }[] = []
  for (const m of text.matchAll(/\bq([123])\b/g))
    refs.push({ at: m.index, ref: `Q${m[1]}` as 'Q1' })
  for (const m of text.matchAll(/\blap\s*(\d{1,2})\b/g))
    refs.push({ at: m.index, ref: Number(m[1]) })
  return refs.sort((x, y) => x.at - y.at).map((r) => r.ref)
}

export const has = (text: string, pattern: RegExp) => pattern.test(text)

export const SPEEDS = [1, 4, 16, 64] as const

export function nearestSpeed(n: number): (typeof SPEEDS)[number] {
  return SPEEDS.reduce((best, s) => (Math.abs(s - n) < Math.abs(best - n) ? s : best), SPEEDS[0])
}

export function findCompound(text: string): 'SOFT' | 'MEDIUM' | 'HARD' | null {
  if (/\bhards?\b|\bhard tyres?\b/.test(text)) return 'HARD'
  if (/\bmediums?\b/.test(text)) return 'MEDIUM'
  if (/\bsofts?\b/.test(text)) return 'SOFT'
  return null
}

export const HISTORY_WORDS =
  /\b(career|all.?time|ever|history|historic|head.?to.?head|h2h|titles?|championships?|world champions?|records?|greatest|goat|legends?)\b/

/** Constructors people ask about by name; the tool resolves the exact team. */
export const TEAM_WORDS =
  /\b(ferrari|mercedes|mclaren|red bull|williams|lotus|brabham|tyrrell|benetton|renault|alpine|aston martin|jordan|sauber|haas|toro rosso|racing bulls|alphatauri|force india|racing point|brawn|toyota|honda|bmw sauber|cooper|maserati|vanwall|ligier|march|minardi|jaguar|stewart|arrows|matra|kick sauber|audi|cadillac)\b/

export const STAT_WORDS: [RegExp, string][] = [
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

export function cleanName(text: string): string | null {
  const words = text
    .replace(/[?.!]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !NAME_NOISE.has(w))
  return words.length ? words.join(' ') : null
}

export function period(text: string): { from?: number; to?: number } {
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
