import {
  type ArchiveInputs,
  HISTORY_TABS,
  TRACES,
  VIEWS,
  type DuelSelection,
  type HistoryTab,
  type Trace,
  type View,
} from '@unbox-box/tools'

/**
 * The app's URLs. What a page shows goes in the path; view settings go in the query:
 *
 *   /duel/2026-dutch-grand-prix-r/NOR-49-vs-ANT-59/?corner=10&traces=speed,throttle
 *   /replay/2026-dutch-grand-prix-r/?at=1834&follow=NOR
 *   /strategy/2026-dutch-grand-prix-r/
 *   /history/drivers/michael-schumacher/
 *   /history/head-to-head/max-verstappen-vs-lando-norris/
 *   /circuits/zandvoort/
 *   /races/1988/3/qualifying/
 *   /records/teams/wins/?era=1990s
 *   /engines/honda/  ·  /engines/tyres/pirelli/
 *   /nations/nl/
 *
 * The site is a static export with one page per view, so the host rewrites deeper paths to
 * the view's page (scripts/security-policy.mjs). Older links (/duel/?s=…&a=…, ?v=lap-duel&la=…)
 * still open correctly.
 */

export const VIEW_SLUG: Record<View, string> = {
  'lap-duel': 'duel',
  replay: 'replay',
  strategy: 'strategy',
  history: 'history',
  circuits: 'circuits',
  races: 'races',
  records: 'records',
  engines: 'engines',
  nations: 'nations',
  help: 'help',
}
const SLUG_VIEW = new Map(Object.entries(VIEW_SLUG).map(([v, s]) => [s, v as View]))

/** Friendlier names for traces in links ("gap" rather than the internal "delta"). */
const TRACE_SLUG: Partial<Record<Trace, string>> = { delta: 'gap' }
const traceFromSlug = (s: string): Trace | undefined => {
  const hit = (Object.entries(TRACE_SLUG) as [Trace, string][]).find(([, slug]) => slug === s)
  if (hit) return hit[0]
  return (TRACES as readonly string[]).includes(s) ? (s as Trace) : undefined
}

export interface RouteState {
  view?: View
  sessionId?: string
  duel?: Partial<DuelSelection>
  corner?: number
  traces?: Trace[]
  replayTime?: number
  follow?: string
  history?: {
    tab?: HistoryTab
    driver?: string
    team?: string
    season?: number
    a?: string
    b?: string
  }
  circuit?: string
  archive?: Partial<ArchiveInputs>
}

const positiveInt = (v: string | null) => {
  const n = Number(v)
  return v != null && Number.isInteger(n) && n > 0 ? n : undefined
}

/** "NOR-49" → { code: "NOR", lap: 49 } */
function driverLap(v: string | null): { code?: string; lap?: number } {
  if (!v) return {}
  const [code, lap] = v.split('-')
  return { code: code?.toUpperCase() || undefined, lap: positiveInt(lap ?? null) }
}

export function parseRoute(pathname: string, search: string): RouteState {
  const route = parseRawRoute(pathname, search)
  // History's old Seasons tab now lives in the Race Archive (championship tab).
  const p = new URLSearchParams(search)
  if (route.view === 'history' && (p.get('section') ?? p.get('ht')) === 'seasons') {
    return {
      ...route,
      view: 'races',
      archive: { ...route.archive, season: route.history?.season, section: 'championship' },
    }
  }
  return route
}

/** Ids in paths: letters, digits and dashes only, so nothing odd reaches the app. */
const ID = /^[a-z0-9-]{1,80}$/i
const id = (v: string | null | undefined) => (v && ID.test(v) ? v : undefined)
const isNumber = (v: string | undefined) => v != null && /^\d+$/.test(v)

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return ''
  }
}

/** The view and the path segments after it. One-page builds carry both in the query. */
function viewAndSegments(pathname: string, p: URLSearchParams) {
  const segments = pathname.split('/').filter(Boolean).map(decode)
  const at = segments.findIndex((s) => SLUG_VIEW.has(s))
  if (at >= 0) return { view: SLUG_VIEW.get(segments[at]!), rest: segments.slice(at + 1) }
  const legacy = p.get('v') ?? p.get('view')
  const view =
    legacy && (VIEWS as readonly string[]).includes(legacy)
      ? (legacy as View)
      : legacy
        ? SLUG_VIEW.get(legacy)
        : undefined
  return { view, rest: (p.get('path') ?? '').split('/').filter(Boolean) }
}

/** "NOR-49-vs-ANT-59" → both drivers and laps. */
const DUEL_PAIR = /^([a-z]{3})-(\d+)-vs-([a-z]{3})-(\d+)$/i

/** What each view keeps in its path, read back. */
function parsePath(view: View | undefined, rest: string[]): RouteState {
  const [first, second, third] = rest
  switch (view) {
    case 'lap-duel': {
      const m = second ? DUEL_PAIR.exec(second) : null
      const duel = m
        ? { a: m[1]!.toUpperCase(), lapA: Number(m[2]), b: m[3]!.toUpperCase(), lapB: Number(m[4]) }
        : undefined
      return { sessionId: id(first), ...(duel && { duel }) }
    }
    case 'replay':
    case 'strategy':
      return { sessionId: id(first) }
    case 'history': {
      if (first === 'drivers' || first === 'teams') {
        const key = first === 'drivers' ? 'driver' : 'team'
        return { history: { tab: first, ...(id(second) && { [key]: second }) } }
      }
      const [a, b] = first === 'head-to-head' ? (second ?? '').split('-vs-') : []
      return first === 'head-to-head'
        ? { history: { tab: first, ...(id(a) && id(b) && { a, b }) } }
        : {}
    }
    case 'circuits':
      return { circuit: id(first) }
    case 'races': {
      if (!isNumber(first)) return { archive: pick({ section: id(first) }) }
      const round = isNumber(second) ? second : undefined
      return {
        archive: pick({
          season: positiveInt(first!),
          round: positiveInt(round ?? null),
          ...(round ? { session: id(third) } : { section: id(second) }),
        }),
      }
    }
    case 'records':
      return { archive: pick({ scope: id(first), board: id(second) }) }
    case 'engines':
      return first === 'tyres'
        ? { archive: pick({ kind: 'tyre', maker: id(second) }) }
        : { archive: pick({ maker: id(first) }) }
    case 'nations':
      return {
        archive: pick({
          nation: /^[a-z]{2}$/i.test(first ?? '') ? first!.toUpperCase() : undefined,
        }),
      }
    default:
      return {}
  }
}

const pick = <T extends object>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v != null)) as Partial<T>

function parseRawRoute(pathname: string, search: string): RouteState {
  const p = new URLSearchParams(search)
  const { view, rest } = viewAndSegments(pathname, p)
  const query = parseQuery(p)
  const path = parsePath(view, rest)
  // The path wins; the query fills in settings and older links.
  return {
    ...query,
    view,
    sessionId: path.sessionId ?? query.sessionId,
    duel: { ...query.duel, ...path.duel },
    history: { ...query.history, ...pick(path.history ?? {}) },
    circuit: path.circuit ?? query.circuit,
    archive: { ...query.archive, ...path.archive },
  }
}

function parseQuery(p: URLSearchParams): RouteState {
  const a = driverLap(p.get('a'))
  const b = driverLap(p.get('b'))
  const traces = (p.get('traces') ?? p.get('t'))
    ?.split(',')
    .map(traceFromSlug)
    .filter((t): t is Trace => !!t)
  const tab = p.get('section') ?? p.get('ht')
  const pair = p.get('pair')?.split(',')
  return {
    sessionId: id(p.get('s')),
    duel: {
      a: a.code,
      b: b.code,
      lapA: a.lap ?? positiveInt(p.get('la')),
      lapB: b.lap ?? positiveInt(p.get('lb')),
    },
    corner: positiveInt(p.get('corner') ?? p.get('c')),
    traces: traces?.length ? traces : undefined,
    replayTime: positiveInt(p.get('at') ?? p.get('rt')),
    follow: p.get('follow')?.toUpperCase() ?? undefined,
    history: {
      tab:
        tab && (HISTORY_TABS as readonly string[]).includes(tab) ? (tab as HistoryTab) : undefined,
      driver: id(p.get('driver') ?? p.get('hd')),
      team: id(p.get('team') ?? p.get('hc')),
      season: positiveInt(p.get('season') ?? p.get('hy')),
      a: id(pair?.[0]),
      b: id(pair?.[1]),
    },
    circuit: id(p.get('circuit')),
    archive: parseArchive(p),
  }
}

/** Archive keys; unknown or malformed values are dropped so a bad link falls back cleanly. */
function parseArchive(p: URLSearchParams): Partial<ArchiveInputs> {
  const word = (k: string) => {
    const v = p.get(k)
    return v && /^[a-z0-9-]{1,40}$/i.test(v) ? v : undefined
  }
  const kind = p.get('kind')
  const nation = word('nation')
  return pick({
    season: positiveInt(p.get('season')),
    round: positiveInt(p.get('round')),
    session: word('session'),
    section: word('section'),
    scope: word('scope'),
    board: word('board'),
    era: word('era'),
    kind: kind === 'engine' || kind === 'tyre' ? kind : undefined,
    maker: word('maker'),
    nation: nation?.length === 2 ? nation.toUpperCase() : undefined,
  })
}

export interface RouteInput {
  view: View
  sessionId: string | null
  duel: DuelSelection | null
  corner: number | null
  traces: Trace[]
  defaultTraces: readonly Trace[]
  replayTime: number
  follow: string | null
  history: RouteState['history']
  circuit: string | null
  archive?: Partial<ArchiveInputs>
}

/** A route before it is written out: the view's slug, the path segments after it, the query. */
export interface RouteParts {
  slug: string
  segments: string[]
  query: string
}

/** Query values keep commas and dashes readable (no %2C). */
const encode = (v: string) => encodeURIComponent(v).replace(/%2C/gi, ',')

type Value = string | number | null | undefined

/** What each view keeps in its path (see the scheme at the top). */
function pathSegments(s: RouteInput): Value[] {
  const a = s.archive ?? {}
  switch (s.view) {
    case 'lap-duel':
      return [s.sessionId, s.duel && `${s.duel.a}-${s.duel.lapA}-vs-${s.duel.b}-${s.duel.lapB}`]
    case 'replay':
    case 'strategy':
      return [s.sessionId]
    case 'history': {
      const h = s.history ?? {}
      if (h.tab === 'drivers') return ['drivers', h.driver]
      if (h.tab === 'teams') return ['teams', h.team]
      return h.a && h.b ? ['head-to-head', `${h.a}-vs-${h.b}`] : []
    }
    case 'circuits':
      return [s.circuit]
    case 'races':
      if (a.round) return [a.season, a.round, a.session === 'race' ? undefined : a.session]
      return [a.season, a.section === 'championship' ? undefined : a.section]
    case 'records': {
      const scope = a.scope === 'drivers' && !a.board ? undefined : a.scope
      return [a.board ? (scope ?? 'drivers') : scope, a.board]
    }
    case 'engines':
      return a.kind === 'tyre' ? ['tyres', a.maker] : [a.maker]
    case 'nations':
      return [a.nation?.toLowerCase()]
    default:
      return []
  }
}

/** Settings that stay in the query. */
function queryPairs(s: RouteInput): [string, Value][] {
  switch (s.view) {
    case 'lap-duel':
      return [
        ['corner', s.corner],
        [
          'traces',
          s.traces.join() === s.defaultTraces.join()
            ? undefined
            : s.traces.map((t) => TRACE_SLUG[t] ?? t).join(','),
        ],
      ]
    case 'replay':
      return [
        ['at', s.replayTime >= 1 ? Math.round(s.replayTime) : undefined],
        ['follow', s.follow],
      ]
    case 'records':
      return [['era', s.archive?.era === 'all' ? undefined : s.archive?.era]]
    default:
      return []
  }
}

const present = (v: Value): v is string | number => v != null && v !== ''

export function routeParts(s: RouteInput): RouteParts {
  const segments: string[] = []
  // A missing segment ends the path: later parts only make sense after earlier ones.
  for (const v of pathSegments(s)) {
    if (!present(v)) break
    segments.push(String(v))
  }
  const query = queryPairs(s)
    .filter((kv): kv is [string, string | number] => present(kv[1]))
    .map(([k, v]) => `${k}=${encode(String(v))}`)
    .join('&')
  return { slug: VIEW_SLUG[s.view], segments, query }
}

/** The path and query for the current state; only what this view needs. */
export function buildRoute(s: RouteInput): string {
  const { slug, segments, query } = routeParts(s)
  const path = [slug, ...segments.map(encodeURIComponent)].join('/')
  return `/${path}/${query ? `?${query}` : ''}`
}
