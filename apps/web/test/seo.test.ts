import { describe, expect, it } from 'vitest'
import { parseRoute } from '../src/lib/routes'
import { jsonLdHtml, siteLd } from '../src/lib/seo/json-ld'
import { loadSeoSource } from '../src/lib/seo/load-source'
import { pageMetadata } from '../src/lib/seo/metadata'
import {
  circuitPages,
  driverPages,
  racePages,
  seoPages,
  sessionPages,
  teamPages,
  type SeoSource,
} from '../src/lib/seo/pages'

const source = loadSeoSource()
const pages = seoPages(source)
const find = (path: string) => pages.find((p) => p.path === path)

describe('SEO pages', () => {
  it('gives every page a unique path, a heading and a search-length description', () => {
    expect(new Set(pages.map((p) => p.path)).size).toBe(pages.length)
    for (const p of pages) {
      expect(p.path, p.path).toMatch(/^\/[a-z]+\/[a-z0-9/-]+\/$/)
      expect(p.heading.length, p.path).toBeGreaterThan(5)
      expect(p.description.length, p.path).toBeGreaterThan(50)
      expect(p.description.length, p.path).toBeLessThan(320)
    }
  })

  it('uses paths the app reads back to the same page', () => {
    const race = find('/races/1988/3/')!
    expect(parseRoute(race.path, '').archive).toMatchObject({ season: 1988, round: 3 })
    const driver = driverPages(source)[0]!
    expect(parseRoute(driver.path, '').history).toMatchObject({
      tab: 'drivers',
      driver: driver.segments[1],
    })
    const team = teamPages(source)[0]!
    expect(parseRoute(team.path, '').history).toMatchObject({
      tab: 'teams',
      team: team.segments[1],
    })
    const circuit = circuitPages(source)[0]!
    expect(parseRoute(circuit.path, '').circuit).toBe(circuit.segments[0])
  })

  it('names the winner and pole sitter of a race', () => {
    const monaco = find('/races/1988/3/')!
    expect(monaco.heading).toBe('1988 Monaco Grand Prix results')
    expect(monaco.description).toContain('Won by Alain Prost (McLaren)')
    expect(monaco.description).toContain('pole: Ayrton Senna')
    expect(monaco.date).toBeUndefined()
    expect(monaco.jsonLd[0]).toMatchObject({ '@type': 'SportsEvent', startDate: '1988-05-15' })
  })

  it('covers every race weekend, and drivers and teams who started a race', () => {
    const h = source.history
    expect(racePages(source)).toHaveLength(h.races.year.length)
    expect(driverPages(source)).toHaveLength(h.drivers.filter((d) => d.starts > 0).length)
    expect(teamPages(source).length).toBeGreaterThan(100)
    expect(circuitPages(source)).toHaveLength(h.circuits.length)
  })

  it('writes a driver profile with career numbers', () => {
    const prost = find('/history/drivers/alain-prost/')!
    expect(prost.heading).toBe('Alain Prost F1 career stats')
    expect(prost.description).toMatch(/51 wins.*4 world titles/)
    expect(prost.jsonLd[0]).toMatchObject({
      '@type': 'ProfilePage',
      mainEntity: { '@type': 'Person', name: 'Alain Prost' },
    })
  })

  it('only dates pages a sitemap can date (1970 onwards)', () => {
    for (const p of pages) if (p.date) expect(p.date >= '1970-01-01', p.path).toBe(true)
  })

  it('ends every page with breadcrumbs back to the view and home', () => {
    const crumbs = find('/races/1988/3/')!.jsonLd.at(-1) as {
      itemListElement: { name: string }[]
    }
    expect(crumbs.itemListElement.map((i) => i.name)).toEqual([
      'Unbox Box',
      'Race Archive',
      '1988 Monaco Grand Prix results',
    ])
  })
})

describe('session pages', () => {
  const session = (session: string): SeoSource => ({
    ...source,
    sessions: [
      {
        id: `2026-dutch-grand-prix-${session[0]!.toLowerCase()}`,
        season: 2026,
        round: 12,
        event: 'Dutch Grand Prix',
        session,
        date: '2026-08-23',
        circuit: 'Circuit Park Zandvoort',
      },
    ],
  })

  it('gives a race telemetry, strategy and replay pages', () => {
    const [duel, strategy, replay] = sessionPages(session('Race'))
    expect(duel!.path).toBe('/duel/2026-dutch-grand-prix-r/')
    expect(duel!.heading).toBe('2026 Dutch Grand Prix Race telemetry: lap comparison')
    expect(duel!.description).toContain('F1 telemetry analysis')
    expect(strategy!.path).toBe('/strategy/2026-dutch-grand-prix-r/')
    expect(replay!.path).toBe('/replay/2026-dutch-grand-prix-r/')
    expect(parseRoute(strategy!.path, '').sessionId).toBe('2026-dutch-grand-prix-r')
  })

  it('gives qualifying a telemetry page only', () => {
    const pages = sessionPages(session('Qualifying'))
    expect(pages.map((p) => p.view)).toEqual(['lap-duel'])
  })
})

describe('structured data', () => {
  it('describes the site as a free sports web app', () => {
    const [site, app] = siteLd('About')
    expect(site).toMatchObject({ '@type': 'WebSite', name: 'Unbox Box' })
    expect(app).toMatchObject({
      '@type': 'WebApplication',
      applicationCategory: 'SportsApplication',
      isAccessibleForFree: true,
    })
  })

  it('cannot close its script tag early', () => {
    expect(jsonLdHtml({ name: '</script><script>alert(1)</script>' })).not.toContain('<')
  })

  it('builds page metadata with the site name in the title', () => {
    const meta = pageMetadata({ path: '/races/', heading: 'Race Archive', description: 'All.' })
    expect(meta.title).toBe('Race Archive · Unbox Box')
    expect(meta.openGraph).toMatchObject({ url: '/races/' })
  })
})
