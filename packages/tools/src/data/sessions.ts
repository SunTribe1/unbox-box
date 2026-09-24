import type { SessionSummary } from './schema'
import { stripAccents } from '../util/text'

/** Finding sessions across seasons: "Monaco 2024 quali", "COTA sprint", "2023". Shared by the
 *  command engine, the find_session tool and the session picker. */

export const SESSION_ORDER = ['Sprint Qualifying', 'Sprint', 'Qualifying', 'Race'] as const
/** When the asked-for session type doesn't exist at an event, try these in order. */
const FALLBACK = ['Qualifying', 'Race', 'Sprint', 'Sprint Qualifying']

/** Nicknames, cities and circuits → the event name without "Grand Prix". */
const NICKNAMES: Record<string, string[]> = {
  monza: ['italian'],
  imola: ['emilia romagna'],
  silverstone: ['british'],
  britain: ['british'],
  spa: ['belgian'],
  francorchamps: ['belgian'],
  suzuka: ['japanese'],
  japan: ['japanese'],
  interlagos: ['sao paulo'],
  brazil: ['sao paulo'],
  brazilian: ['sao paulo'],
  cota: ['united states'],
  austin: ['united states'],
  vegas: ['las vegas'],
  jeddah: ['saudi arabian'],
  saudi: ['saudi arabian'],
  sakhir: ['bahrain'],
  baku: ['azerbaijan'],
  zandvoort: ['dutch'],
  barcelona: ['barcelona catalunya', 'spanish'],
  catalunya: ['barcelona catalunya', 'spanish'],
  madrid: ['spanish'],
  madring: ['spanish'],
  hungaroring: ['hungarian'],
  budapest: ['hungarian'],
  spielberg: ['austrian'],
  'red bull ring': ['austrian'],
  lusail: ['qatar'],
  losail: ['qatar'],
  shanghai: ['chinese'],
  china: ['chinese'],
  melbourne: ['australian'],
  'albert park': ['australian'],
  montreal: ['canadian'],
  canada: ['canadian'],
  mexico: ['mexico city'],
  'marina bay': ['singapore'],
  yas: ['abu dhabi'],
  'yas marina': ['abu dhabi'],
}

export function normalizeText(text: string): string {
  return stripAccents(text).toLowerCase()
}

/** "São Paulo Grand Prix" → "sao paulo". */
export function eventStem(event: string): string {
  return normalizeText(event)
    .replace(/\bgrand prix\b/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const phrase = (p: string) => new RegExp(`\\b${escape(p).replace(/ /g, '[\\s-]+')}\\b`, 'g')

interface Span {
  start: number
  end: number
}

interface KindMatch {
  kind: string
  span: Span
}

const KIND_PATTERNS: [RegExp, string][] = [
  [/\bsprint[\s-]+(?:quali\w*|shootout)\b|\bsq\b/g, 'Sprint Qualifying'],
  [/\bsprint(?:\s+race)?\b/g, 'Sprint'],
  [/\b(?:quali\w*|qualy)\b/g, 'Qualifying'],
  [/\b(?:race|grand prix|gp)\b/g, 'Race'],
]

export function sessionKind(text: string): KindMatch | null {
  const t = normalizeText(text)
  for (const [re, kind] of KIND_PATTERNS) {
    const m = new RegExp(re).exec(t)
    if (m) return { kind, span: { start: m.index, end: m.index + m[0].length } }
  }
  return null
}

/** Canonical session type for loose input: "quali", "SQ", "sprint shootout", "race". */
export function canonicalKind(text: string): string | null {
  const t = normalizeText(text).trim()
  if (t === 'q') return 'Qualifying'
  if (t === 'r') return 'Race'
  if (t === 's') return 'Sprint'
  return sessionKind(t)?.kind ?? null
}

interface EventMatch {
  stems: string[]
  strength: number
  span: Span
}

/** Finds an event mention: the event stem or a nickname (strong), or a country (weak). */
function findEvent(text: string, sessions: SessionSummary[]): EventMatch | null {
  const t = normalizeText(text)
  const stems = new Set(sessions.map((s) => eventStem(s.event)))
  const candidates: [string, string[], number][] = [
    ...[...stems].map((stem): [string, string[], number] => [stem, [stem], 2]),
    ...Object.entries(NICKNAMES).map(([nick, to]): [string, string[], number] => [nick, to, 2]),
  ]
  for (const s of sessions) {
    if (s.country) candidates.push([normalizeText(s.country), [eventStem(s.event)], 1])
  }
  let best: EventMatch | null = null
  for (const [needle, to, strength] of candidates) {
    if (needle.length < 3) continue
    const m = phrase(needle).exec(t)
    if (!m) continue
    const span = { start: m.index, end: m.index + m[0].length }
    const longer = best && span.end - span.start > best.span.end - best.span.start
    if (!best || strength > best.strength || (strength === best.strength && longer)) {
      best = { stems: to.filter((x) => stems.has(x)), strength, span }
    } else if (strength === best.strength && span.start === best.span.start) {
      best.stems = [...new Set([...best.stems, ...to.filter((x) => stems.has(x))])]
    }
  }
  return best && best.stems.length ? best : null
}

function yearOf(text: string): { season: number; span: Span } | null {
  const m = /\b(20[1-3]\d)\b/.exec(text)
  return m ? { season: Number(m[1]), span: { start: m.index, end: m.index + 4 } } : null
}

function pickKind(options: SessionSummary[], kind: string): SessionSummary | undefined {
  return (
    options.find((s) => s.session === kind) ??
    FALLBACK.map((k) => options.find((s) => s.session === k)).find(Boolean)
  )
}

/** Removes the matched words (plus a dangling "at", "in", "the"…) from the original text. */
function stripSpans(raw: string, spans: Span[]): string {
  const plain = stripAccents(raw)
  let out = ''
  let at = 0
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    out += `${plain.slice(at, span.start)} `
    at = Math.max(at, span.end)
  }
  out += plain.slice(at)
  const filler = /\b(?:at|in|from|during|for|of|the)\s*$/i
  return out
    .split(/\s{2,}|\s(?=[?!.,])/)
    .map((part) => {
      let p = part.trim()
      while (filler.test(p)) p = p.replace(filler, '').trim()
      return p
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([?!.,])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface SessionHit {
  id: string
  session: SessionSummary
  /** The question with the season, event and session words removed. */
  rest: string
}

/** The session a question points at, when it's not the current one. Needs a year or an event
 *  name; a session type alone ("race", "pole") never switches sessions. */
export function findSession(
  raw: string,
  sessions: SessionSummary[],
  currentId: string | null,
): SessionHit | null {
  const year = yearOf(raw)
  const event = findEvent(raw, sessions)
  if (!year && !event) return null
  const kind = sessionKind(raw)
  const current = sessions.find((s) => s.id === currentId)

  const stems = event?.stems ?? (current ? [eventStem(current.event)] : [])
  const atEvent = sessions.filter((s) => stems.includes(eventStem(s.event)))
  const season =
    year?.season ??
    (current && atEvent.some((s) => s.season === current.season)
      ? current.season
      : Math.max(...atEvent.map((s) => s.season)))
  // Only Race/Qualifying/Sprint words count once we know a year or event was named.
  const wanted = kind?.kind ?? current?.session ?? 'Qualifying'
  const options = atEvent.filter((s) => s.season === season)
  const picked = pickKind(options, wanted)
  if (!picked || picked.id === currentId) return null

  const spans = [year?.span, event?.span, kind?.span].filter((x): x is Span => !!x)
  return { id: picked.id, session: picked, rest: stripSpans(raw, spans) }
}

export interface SessionQuery {
  season?: number
  event?: string
  session?: string
}

/** Structured search, newest first. `event` accepts names, nicknames, circuits or countries. */
export function matchSessions(sessions: SessionSummary[], query: SessionQuery): SessionSummary[] {
  const kind = query.session ? canonicalKind(query.session) : null
  let stems: string[] | null = null
  if (query.event) {
    const e = findEvent(query.event, sessions)
    const q = normalizeText(query.event)
    stems = e
      ? e.stems
      : [
          ...new Set(
            sessions
              .filter((s) =>
                normalizeText(`${s.event} ${s.circuit} ${s.country ?? ''}`).includes(q),
              )
              .map((s) => eventStem(s.event)),
          ),
        ]
  }
  return sessions.filter(
    (s) =>
      (query.season == null || s.season === query.season) &&
      (!kind || s.session === kind) &&
      (!stems || stems.includes(eventStem(s.event))),
  )
}

export interface EventGroup {
  key: string
  season: number
  round: number | null
  event: string
  circuit: string
  country: string | null
  date: string | null
  sessions: SessionSummary[]
}

export interface SeasonGroup {
  season: number
  events: EventGroup[]
}

const orderOf = (session: string) => {
  const i = SESSION_ORDER.indexOf(session as (typeof SESSION_ORDER)[number])
  return i === -1 ? SESSION_ORDER.length : i
}

/** Season → event → sessions. Newest season and round first; sessions in weekend order. */
export function groupSessions(sessions: SessionSummary[]): SeasonGroup[] {
  const events = new Map<string, EventGroup>()
  for (const s of sessions) {
    const key = `${s.season}|${s.event}`
    const group = events.get(key) ?? {
      key,
      season: s.season,
      round: s.round ?? null,
      event: s.event,
      circuit: s.circuit,
      country: s.country ?? null,
      date: s.date,
      sessions: [],
    }
    if (s.date && (!group.date || s.date > group.date)) group.date = s.date
    events.set(key, { ...group, sessions: [...group.sessions, s] })
  }
  const seasons = new Map<number, EventGroup[]>()
  for (const group of events.values()) {
    const sorted = {
      ...group,
      sessions: [...group.sessions].sort(
        (a, b) =>
          orderOf(a.session) - orderOf(b.session) || (a.date ?? '').localeCompare(b.date ?? ''),
      ),
    }
    seasons.set(group.season, [...(seasons.get(group.season) ?? []), sorted])
  }
  return [...seasons.entries()]
    .sort(([a], [b]) => b - a)
    .map(([season, list]) => ({
      season,
      events: list.sort(
        (a, b) => (b.round ?? 0) - (a.round ?? 0) || (b.date ?? '').localeCompare(a.date ?? ''),
      ),
    }))
}
