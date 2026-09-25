import { buildRoute, parseRoute, routeParts, type RouteInput, type RouteState } from './routes'
import { DEFAULT_TRACES, useApp, usePlayback } from './store'

/** Keeps the address bar in step with the app (see routes.ts for the URL scheme). Switching
 *  view adds a history entry, so Back and Forward move between views; everything else
 *  updates the current entry in place. */

export type UrlState = RouteState

export function readUrl(): UrlState {
  if (typeof window === 'undefined') return {}
  return parseRoute(window.location.pathname, window.location.search)
}

/** Links use path routing unless the build serves one index page (a relative-asset preview). */
const PATH_ROUTING = process.env.NEXT_PUBLIC_QUERY_ROUTING !== '1'

function currentRoute(): string | null {
  const { sessionId, duel, corner, traces, view, history, circuit, archive } = useApp.getState()
  const playback = usePlayback.getState()
  if (!sessionId) return null
  const input: RouteInput = {
    view,
    sessionId,
    duel,
    corner,
    traces,
    defaultTraces: DEFAULT_TRACES,
    replayTime: playback.time,
    follow: playback.focus,
    history,
    circuit,
    archive,
  }
  // Help keeps its #section anchor.
  if (PATH_ROUTING)
    return view === 'help' ? `${buildRoute(input)}${window.location.hash}` : buildRoute(input)
  // One-page builds: keep the page, carry the view and its path in the query instead.
  const { slug, segments, query } = routeParts(input)
  const path = segments.length ? `&path=${segments.map(encodeURIComponent).join('/')}` : ''
  return `${window.location.pathname}?view=${slug}${path}${query ? `&${query}` : ''}`
}

let lastPlace: string | null = null

/** A "place" is what Back should return to: the view, plus the page within it (a circuit,
 *  a race weekend, a maker, a nation). */
const placeOf = () => {
  const { view, circuit, archive: a } = useApp.getState()
  if (view === 'circuits') return `${view}:${circuit ?? ''}`
  if (view === 'races') return `${view}:${a.season ?? ''}:${a.round ?? ''}`
  if (view === 'engines') return `${view}:${a.kind ?? ''}:${a.maker ?? ''}`
  if (view === 'nations') return `${view}:${a.nation ?? ''}`
  return view
}

function write() {
  const next = currentRoute()
  if (!next) return
  const here = `${window.location.pathname}${window.location.search}${useApp.getState().view === 'help' ? window.location.hash : ''}`
  if (next === here) return
  const place = placeOf()
  // A new place is a new history entry, so Back returns to where you were.
  if (lastPlace && place !== lastPlace) window.history.pushState(null, '', next)
  else window.history.replaceState(null, '', next)
  lastPlace = place
}

/** Back / Forward: bring the view (and History or Circuits selection) back from the URL. */
function onPopState() {
  const url = readUrl()
  const app = useApp.getState()
  if (url.view && url.view !== app.view) app.setView(url.view)
  app.setCircuit(url.circuit ?? null)
  // Page-level keys come back from the URL; missing ones mean "the index page".
  const a = url.archive ?? {}
  app.setArchive({
    season: a.season,
    round: a.round,
    session: a.session,
    kind: a.kind,
    maker: a.maker,
    nation: a.nation,
    ...(a.scope && { scope: a.scope }),
    ...(a.board && { board: a.board }),
    ...(a.era && { era: a.era }),
  })
  lastPlace = placeOf()
  const h = Object.fromEntries(Object.entries(url.history ?? {}).filter(([, v]) => v != null))
  if (Object.keys(h).length) app.setHistory(h)
}

export function startUrlSync(): () => void {
  lastPlace = placeOf()
  const stopApp = useApp.subscribe(
    (s) =>
      [s.sessionId, s.duel, s.corner, s.traces, s.view, s.history, s.circuit, s.archive] as const,
    write,
    { equalityFn: (x, y) => x.every((v, i) => v === y[i]) },
  )
  // Replay time and the followed car are written when playback stops or on a seek while
  // paused, not every frame.
  const stopPlayback = usePlayback.subscribe(
    (s) => [s.playing, s.playing ? 0 : Math.round(s.time), s.focus] as const,
    write,
    { equalityFn: (x, y) => x.every((v, i) => v === y[i]) },
  )
  window.addEventListener('popstate', onPopState)
  write()
  return () => {
    stopApp()
    stopPlayback()
    window.removeEventListener('popstate', onPopState)
  }
}
