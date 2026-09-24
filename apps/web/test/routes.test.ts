import { describe, expect, it } from 'vitest'
import { buildRoute, parseRoute, type RouteInput } from '../src/lib/routes'

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

describe('routes', () => {
  it('gives each view a path and spells the duel out', () => {
    expect(buildRoute(base)).toBe('/duel/?s=2026-dutch-grand-prix-r&a=NOR-49&b=ANT-59&corner=10')
  })

  it('writes traces only when changed, with readable commas', () => {
    const url = buildRoute({ ...base, corner: null, traces: ['throttle', 'delta'] })
    expect(url).toBe('/duel/?s=2026-dutch-grand-prix-r&a=NOR-49&b=ANT-59&traces=throttle,gap')
  })

  it('keeps only what each view needs', () => {
    expect(buildRoute({ ...base, view: 'replay', replayTime: 1834.4, follow: 'NOR' })).toBe(
      '/replay/?s=2026-dutch-grand-prix-r&at=1834&follow=NOR',
    )
    expect(
      buildRoute({ ...base, view: 'history', history: { tab: 'drivers', driver: 'jim-clark' } }),
    ).toBe('/history/?s=2026-dutch-grand-prix-r&section=drivers&driver=jim-clark')
    expect(buildRoute({ ...base, view: 'circuits', circuit: 'zandvoort' })).toBe(
      '/circuits/?s=2026-dutch-grand-prix-r&circuit=zandvoort',
    )
  })

  it('reads what it writes', () => {
    const r = parseRoute('/duel/', '?s=x&a=NOR-49&b=ANT-59&corner=10&traces=throttle,gap')
    expect(r).toMatchObject({
      view: 'lap-duel',
      sessionId: 'x',
      duel: { a: 'NOR', lapA: 49, b: 'ANT', lapB: 59 },
      corner: 10,
      traces: ['throttle', 'delta'],
    })
  })

  it('still opens links made before paths existed', () => {
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

  it('routes the archive views', () => {
    const races = {
      ...base,
      view: 'races' as const,
      archive: { season: 1988, round: 3, session: 'qualifying' },
    }
    expect(buildRoute(races)).toBe(
      '/races/?s=2026-dutch-grand-prix-r&season=1988&round=3&session=qualifying',
    )
    expect(buildRoute({ ...races, archive: { season: 1988, round: 3, session: 'race' } })).toBe(
      '/races/?s=2026-dutch-grand-prix-r&season=1988&round=3',
    )
    expect(
      buildRoute({
        ...base,
        view: 'records',
        archive: { scope: 'teams', board: 'wins', era: '1990s' },
      }),
    ).toBe('/records/?s=2026-dutch-grand-prix-r&scope=teams&board=wins&era=1990s')
    expect(buildRoute({ ...base, view: 'nations', archive: { nation: 'NL' } })).toBe(
      '/nations/?s=2026-dutch-grand-prix-r&nation=nl',
    )
    const parsed = parseRoute('/engines/', '?kind=tyre&maker=pirelli')
    expect(parsed.view).toBe('engines')
    expect(parsed.archive).toEqual({ kind: 'tyre', maker: 'pirelli' })
    expect(parseRoute('/nations/', '?nation=nl').archive).toEqual({ nation: 'NL' })
    expect(parseRoute('/races/', '?season=abc&round=-2&session=%3Cscript%3E').archive).toEqual({})
  })

  it('sends the old History seasons tab to the Race Archive', () => {
    const r = parseRoute('/history/', '?section=seasons&season=2021')
    expect(r.view).toBe('races')
    expect(r.archive).toMatchObject({ season: 2021, section: 'championship' })
  })
})
