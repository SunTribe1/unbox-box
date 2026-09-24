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
 * The app's URLs. Each view has a path, and only the parameters that view needs go in the
 * query, spelled out:
 *
 *   /duel/?s=2026-dutch-grand-prix-r&a=NOR-49&b=ANT-59&corner=10&traces=speed,throttle
 *   /replay/?s=2026-dutch-grand-prix-r&at=1834&follow=NOR
 *   /history/?section=drivers&driver=michael-schumacher
 *   /circuits/?circuit=zandvoort
 *   /races/?season=1988&round=3&session=qualifying
 *   /records/?scope=teams&board=wins&era=1990s
 *   /engines/?kind=tyre&maker=pirelli
 *   /nations/?nation=nl
 *
 * Links made before these paths existed (?v=lap-duel&la=49&t=...) still open correctly.
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
const SLUG_VIEW = Object.fromEntries(Object.entries(VIEW_SLUG).map(([v, s]) => [s, v])) as Record<
  string,
  View
>

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

function parseRawRoute(pathname: string, search: string): RouteState {
  const p = new URLSearchParams(search)
  const slug = pathname.split('/').filter(Boolean).at(-1) ?? ''
  const legacyView = p.get('v') ?? p.get('view')
  const view =
    SLUG_VIEW[slug] ??
    (legacyView && (VIEWS as readonly string[]).includes(legacyView)
      ? (legacyView as View)
      : legacyView
        ? SLUG_VIEW[legacyView]
        : undefined)

  const a = driverLap(p.get('a'))
  const b = driverLap(p.get('b'))
  const traces = (p.get('traces') ?? p.get('t'))
    ?.split(',')
    .map(traceFromSlug)
    .filter((t): t is Trace => !!t)
  const tab = p.get('section') ?? p.get('ht')
  const pair = p.get('pair')?.split(',')
  return {
    view,
    sessionId: p.get('s') ?? undefined,
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
      driver: p.get('driver') ?? p.get('hd') ?? undefined,
      team: p.get('team') ?? p.get('hc') ?? undefined,
      season: positiveInt(p.get('season') ?? p.get('hy')),
      a: pair?.[0] || undefined,
      b: pair?.[1] || undefined,
    },
    circuit: p.get('circuit') ?? undefined,
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
  const out: Partial<ArchiveInputs> = {
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
  }
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v != null))
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

/** Query values keep commas and dashes readable (no %2C). */
const encode = (v: string) => encodeURIComponent(v).replace(/%2C/gi, ',')

/** The path and query for the current state; only what this view needs. */
export function buildRoute(s: RouteInput): string {
  const q: [string, string][] = []
  const add = (k: string, v: string | number | null | undefined) => {
    if (v != null && v !== '') q.push([k, String(v)])
  }
  // The session also sets History's defaults (its winner, its circuit), so every view keeps it.
  add('s', s.sessionId)
  switch (s.view) {
    case 'lap-duel':
      if (s.duel) {
        add('a', `${s.duel.a}-${s.duel.lapA}`)
        add('b', `${s.duel.b}-${s.duel.lapB}`)
      }
      add('corner', s.corner)
      if (s.traces.join() !== s.defaultTraces.join()) {
        add('traces', s.traces.map((t) => TRACE_SLUG[t] ?? t).join(','))
      }
      break
    case 'replay':
      if (s.replayTime >= 1) add('at', Math.round(s.replayTime))
      add('follow', s.follow)
      break
    case 'history': {
      const h = s.history ?? {}
      if (h.tab && h.tab !== 'head-to-head') add('section', h.tab)
      if (h.tab === 'drivers') add('driver', h.driver)
      if (h.tab === 'teams') add('team', h.team)
      if ((!h.tab || h.tab === 'head-to-head') && h.a && h.b) add('pair', `${h.a},${h.b}`)
      break
    }
    case 'circuits':
      add('circuit', s.circuit)
      break
    case 'races':
      add('season', s.archive?.season)
      add('round', s.archive?.round)
      if (!s.archive?.round && s.archive?.section && s.archive.section !== 'championship') {
        add('section', s.archive.section)
      }
      if (s.archive?.round && s.archive.session !== 'race') add('session', s.archive?.session)
      break
    case 'records':
      add('scope', s.archive?.scope === 'drivers' ? undefined : s.archive?.scope)
      add('board', s.archive?.board)
      add('era', s.archive?.era === 'all' ? undefined : s.archive?.era)
      break
    case 'engines':
      add('kind', s.archive?.kind === 'tyre' ? 'tyre' : undefined)
      add('maker', s.archive?.maker)
      break
    case 'nations':
      add('nation', s.archive?.nation?.toLowerCase())
      break
  }
  const query = q.map(([k, v]) => `${k}=${encode(v)}`).join('&')
  return `/${VIEW_SLUG[s.view]}/${query ? `?${query}` : ''}`
}
