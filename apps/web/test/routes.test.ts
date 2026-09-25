import { describe, expect, it } from 'vitest'
import { buildRoute, parseRoute, routeParts, type RouteInput } from '../src/lib/routes'

const DEFAULT = ['delta', 'speed', 'throttle', 'brake', 'gear'] as const
const base: RouteInput = {
  view: 'lap-duel',
  sessionId: '2026-dutch-grand-prix-r',
  duel: { a: 'NOR', lapA: 49, b: 'ANT', lapB: 59 },
  corner: 10,
  traces: [...DEFAULT],
  defaultTraces: DEFAULT,
  replayTime: 0,
  follow: null,
  history: {},
  circuit: null,
}

/** Split a built URL the way the browser does. */
const parse = (url: string) => {
  const [path = '', query = ''] = url.split('?')
  return parseRoute(path, query ? `?${query}` : '')
}

describe('building paths', () => {
  it('puts the session and the duel in the path', () => {
    expect(buildRoute(base)).toBe('/duel/2026-dutch-grand-prix-r/NOR-49-vs-ANT-59/?corner=10')
  })

  it('writes traces only when changed, with readable commas', () => {
    const url = buildRoute({ ...base, corner: null, traces: ['throttle', 'delta'] })
    expect(url).toBe('/duel/2026-dutch-grand-prix-r/NOR-49-vs-ANT-59/?traces=throttle,gap')
  })

  it('keeps only what each view needs', () => {
    expect(buildRoute({ ...base, view: 'replay', replayTime: 1834.4, follow: 'NOR' })).toBe(
      '/replay/2026-dutch-grand-prix-r/?at=1834&follow=NOR',
    )
    expect(buildRoute({ ...base, view: 'strategy' })).toBe('/strategy/2026-dutch-grand-prix-r/')
    expect(buildRoute({ ...base, view: 'help' })).toBe('/help/')
  })

  it('routes History by section', () => {
    const history = (h: RouteInput['history']) =>
      buildRoute({ ...base, view: 'history', history: h })
    expect(history({ tab: 'drivers', driver: 'jim-clark' })).toBe('/history/drivers/jim-clark/')
    expect(history({ tab: 'teams', team: 'ferrari' })).toBe('/history/teams/ferrari/')
    expect(history({ tab: 'drivers' })).toBe('/history/drivers/')
    expect(history({ a: 'max-verstappen', b: 'lando-norris' })).toBe(
      '/history/head-to-head/max-verstappen-vs-lando-norris/',
    )
    expect(history({})).toBe('/history/')
  })

  it('routes the archive views', () => {
    const archive = (view: RouteInput['view'], a: RouteInput['archive']) =>
      buildRoute({ ...base, view, archive: a })
    expect(archive('races', { season: 1988, round: 3, session: 'qualifying' })).toBe(
      '/races/1988/3/qualifying/',
    )
    expect(archive('races', { season: 1988, round: 3, session: 'race' })).toBe('/races/1988/3/')
    expect(archive('races', { season: 1988, section: 'calendar' })).toBe('/races/1988/calendar/')
    expect(archive('races', { season: 1988, section: 'championship' })).toBe('/races/1988/')
    expect(archive('records', { scope: 'teams', board: 'wins', era: '1990s' })).toBe(
      '/records/teams/wins/?era=1990s',
    )
    expect(archive('records', { scope: 'drivers', era: 'all' })).toBe('/records/')
    expect(archive('records', { scope: 'drivers', board: 'poles' })).toBe('/records/drivers/poles/')
    expect(archive('engines', { kind: 'engine', maker: 'honda' })).toBe('/engines/honda/')
    expect(archive('engines', { kind: 'tyre', maker: 'pirelli' })).toBe('/engines/tyres/pirelli/')
    expect(archive('engines', { kind: 'tyre' })).toBe('/engines/tyres/')
    expect(archive('nations', { nation: 'NL' })).toBe('/nations/nl/')
    expect(buildRoute({ ...base, view: 'circuits', circuit: 'zandvoort' })).toBe(
      '/circuits/zandvoort/',
    )
  })

  it('gives one-page builds the parts to carry in the query', () => {
    expect(routeParts(base)).toEqual({
      slug: 'duel',
      segments: ['2026-dutch-grand-prix-r', 'NOR-49-vs-ANT-59'],
      query: 'corner=10',
    })
  })
})

describe('reading paths', () => {
  it('reads what it writes', () => {
    const inputs: RouteInput[] = [
      { ...base, traces: ['throttle', 'delta'] },
      { ...base, view: 'replay', replayTime: 1834, follow: 'NOR' },
      { ...base, view: 'history', history: { tab: 'drivers', driver: 'jim-clark' } },
      { ...base, view: 'history', history: { a: 'max-verstappen', b: 'lando-norris' } },
      { ...base, view: 'circuits', circuit: 'monza' },
      { ...base, view: 'races', archive: { season: 1988, round: 3, session: 'qualifying' } },
      { ...base, view: 'races', archive: { season: 1988, section: 'calendar' } },
      { ...base, view: 'records', archive: { scope: 'teams', board: 'wins', era: '1990s' } },
      { ...base, view: 'engines', archive: { kind: 'tyre', maker: 'pirelli' } },
      { ...base, view: 'nations', archive: { nation: 'NL' } },
    ]
    for (const input of inputs) {
      const url = buildRoute(input)
      expect(buildRoute({ ...input, ...toInput(parse(url)) }), url).toBe(url)
    }
  })

  it('reads the duel from the path', () => {
    expect(parse('/duel/x/NOR-49-vs-ANT-59/?corner=10&traces=throttle,gap')).toMatchObject({
      view: 'lap-duel',
      sessionId: 'x',
      duel: { a: 'NOR', lapA: 49, b: 'ANT', lapB: 59 },
      corner: 10,
      traces: ['throttle', 'delta'],
    })
  })

  it('reads the view from a one-page build query', () => {
    expect(parseRoute('/preview/index.html', '?view=races&path=1988/3/qualifying')).toMatchObject({
      view: 'races',
      archive: { season: 1988, round: 3, session: 'qualifying' },
    })
  })

  it('drops malformed path parts so a bad link falls back cleanly', () => {
    expect(parse('/races/1988/%3Cscript%3E/').archive).toEqual({ season: 1988 })
    expect(parse('/races/1988/3/%3Cb%3E/').archive).toEqual({ season: 1988, round: 3 })
    expect(parse('/duel/%3Cx%3E/nonsense/').sessionId).toBeUndefined()
    expect(parse('/duel/%E0%A4%A/').view).toBe('lap-duel')
    expect(parse('/nations/netherlands/').archive).toEqual({})
    expect(parse('/engines/tyres/').archive).toEqual({ kind: 'tyre' })
  })
})

describe('older links', () => {
  it('still opens query links from before paths existed', () => {
    const r = parseRoute(
      '/',
      '?s=2026-dutch-grand-prix-r&v=lap-duel&a=NOR&la=49&b=ANT&lb=59&c=10&t=throttle%2Cspeed%2Cdelta',
    )
    expect(r).toMatchObject({
      view: 'lap-duel',
      duel: { a: 'NOR', lapA: 49, b: 'ANT', lapB: 59 },
      corner: 10,
      traces: ['throttle', 'speed', 'delta'],
    })
    expect(parseRoute('/', '?v=history&ht=drivers&hd=jim-clark').history).toMatchObject({
      tab: 'drivers',
      driver: 'jim-clark',
    })
  })

  it('still opens view paths with the parameters in the query', () => {
    expect(parseRoute('/duel/', '?s=x&a=NOR-49&b=ANT-59&corner=10')).toMatchObject({
      sessionId: 'x',
      duel: { a: 'NOR', lapA: 49, b: 'ANT', lapB: 59 },
    })
    expect(parseRoute('/engines/', '?kind=tyre&maker=pirelli').archive).toEqual({
      kind: 'tyre',
      maker: 'pirelli',
    })
    expect(parseRoute('/nations/', '?nation=nl').archive).toEqual({ nation: 'NL' })
    expect(parseRoute('/races/', '?season=abc&round=-2&session=%3Cscript%3E').archive).toEqual({})
  })

  it('sends the old History seasons tab to the Race Archive', () => {
    const r = parseRoute('/history/', '?section=seasons&season=2021')
    expect(r.view).toBe('races')
    expect(r.archive).toMatchObject({ season: 2021, section: 'championship' })
  })
})

/** The parsed route as builder input, for round trips. */
function toInput(r: ReturnType<typeof parseRoute>): Partial<RouteInput> {
  const duel = r.duel
  return {
    ...(r.view && { view: r.view }),
    ...(r.sessionId && { sessionId: r.sessionId }),
    ...(duel?.a && duel.b && duel.lapA && duel.lapB && { duel: duel as RouteInput['duel'] }),
    ...(r.traces && { traces: r.traces }),
    ...(r.replayTime && { replayTime: r.replayTime }),
    ...(r.follow && { follow: r.follow }),
    history: r.history,
    circuit: r.circuit ?? null,
    archive: r.archive,
  }
}
