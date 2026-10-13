import { describe, expect, it } from 'vitest'
import { listOf, longDate, ordinal, type SeoCell } from '../src/lib/seo/content'
import { loadSeoSource } from '../src/lib/seo/load-source'
import { seoPages, sitemapPages } from '../src/lib/seo/pages'

const source = loadSeoSource()
const pages = seoPages(source)
const content = (path: string) => {
  const page = pages.find((p) => p.path === path)
  if (!page) throw new Error(`no page ${path}`)
  return page.content
}
const text = (cell: SeoCell | undefined) => (typeof cell === 'object' ? cell.text : cell)
const words = (path: string) => {
  const c = content(path)
  return [...c.intro, ...c.tables.flatMap((t) => t.rows.flat().map(text))].join(' ').split(/\s+/)
    .length
}

describe('SEO page content', () => {
  it('gives every page a summary of its own', () => {
    const intros = new Set(pages.map((p) => p.content.intro.join(' ')))
    // Session pages whose files weren't fetched have links only; everything else is unique.
    const bare = pages.filter((p) => !p.content.intro.length).length
    expect(intros.size + bare).toBeGreaterThanOrEqual(pages.length)
    expect(words('/races/1950/4/')).toBeGreaterThan(150)
  })

  it('tells a race weekend: winner, pole, classification and neighbouring rounds', () => {
    const monaco = content('/races/1988/3/')
    expect(monaco.intro.join(' ')).toContain('Alain Prost won for McLaren from 2nd on the grid.')
    expect(monaco.intro.join(' ')).toContain(
      'Ayrton Senna started from pole position and set the fastest lap.',
    )
    const table = monaco.tables[0]!
    expect(table.head).toEqual(['Pos', 'Driver', 'Team', 'Grid', 'Result', 'Points'])
    expect(table.rows[0]).toEqual([
      '1',
      { text: 'Alain Prost', href: '/history/drivers/alain-prost/' },
      { text: 'McLaren', href: '/history/teams/mclaren/' },
      '2',
      'Finished',
      '9',
    ])
    expect(monaco.related[0]!.links.map((l) => l.href)).toEqual([
      '/races/1988/2/',
      '/races/1988/4/',
      '/circuits/monaco/',
    ])
  })

  it('sums up a driver season by season, with milestones and wins', () => {
    const prost = content('/history/drivers/alain-prost/')
    expect(prost.intro[0]).toContain('raced in Formula 1 from 1980 to 1993')
    expect(prost.intro.join(' ')).toContain('won the World Championship 4 times')
    expect(prost.tables[0]!.rows).toHaveLength(13)
    const milestones = prost.related.find((g) => g.title === 'Milestones')!
    expect(milestones.links[0]!.text).toBe('First race: 1980 Argentina Grand Prix')
    expect(milestones.links.at(-1)!.text).toMatch(/^Last race: 1993/)
  })

  it('lists a team’s drivers and a circuit’s winners, newest first', () => {
    const mclaren = content('/history/teams/mclaren/')
    expect(mclaren.tables[0]!.head[1]).toBe('Drivers')
    expect(mclaren.related.find((g) => g.title === 'Drivers')!.links.length).toBeLessThanOrEqual(40)
    const monza = content('/circuits/monza/')
    expect(monza.intro[0]).toBe(
      'Autodromo Nazionale Monza is a permanent race circuit in Monza, run clockwise.',
    )
    const years = monza.tables[0]!.rows.map((r) => Number(text(r[0])))
    expect(years).toEqual([...years].sort((a, b) => b - a))
  })

  it('shows a different side of a session on each of its pages', () => {
    const quali = content('/duel/2025-italian-grand-prix-q/')
    expect(quali.intro[0]).toBe(
      'Max Verstappen took pole position in qualifying for the 2025 Italian Grand Prix with 1:18.792, 0.077s ahead of Lando Norris.',
    )
    const duel = content('/duel/2025-italian-grand-prix-r/')
    expect(duel.tables[0]!.caption).toMatch(/^Fastest laps/)
    expect(duel.intro[0]).toContain('Lando Norris set the fastest lap')

    const strategy = content('/strategy/2025-italian-grand-prix-r/')
    expect(strategy.intro[0]).toBe(
      'Max Verstappen won the 2025 Italian Grand Prix on a one-stop strategy (Medium → Hard).',
    )
    expect(strategy.tables[0]!.rows[0]![4]).toBe('Medium 1–37, Hard 38–53')

    const replay = content('/replay/2025-italian-grand-prix-r/')
    expect(replay.intro.join(' ')).toContain('gained the most places')
    expect(replay.tables[0]!.head).toContain('Grid')

    expect(new Set([duel, strategy, replay].map((c) => c.tables[0]!.caption)).size).toBe(3)
    expect(replay.related[0]!.links.map((l) => l.href)).not.toContain(
      '/replay/2025-italian-grand-prix-r/',
    )
  })

  it('links only to pages that exist', () => {
    const paths = new Set(pages.map((p) => p.path))
    for (const p of pages) {
      const links = [
        ...p.content.related.flatMap((g) => g.links),
        ...p.content.tables.flatMap((t) => t.rows.flat().filter((c) => typeof c === 'object')),
      ]
      for (const link of links) expect(paths, `${p.path} -> ${link.href}`).toContain(link.href)
    }
  })
})

describe('sitemap order', () => {
  it('puts recent pages first and ranks them higher', () => {
    const list = sitemapPages(source)
    expect(list).toHaveLength(pages.length)
    const latest = source.history.latestSeason
    expect(list[0]!.priority).toBe(0.7)
    expect(list.at(-1)!.priority).toBe(0.3)
    const race1950 = list.findIndex((p) => p.path === '/races/1950/4/')
    const latestRace = list.findIndex((p) => p.path.startsWith(`/races/${latest}/`))
    expect(latestRace).toBeLessThan(race1950)
  })
})

describe('prose helpers', () => {
  it('formats ordinals, lists and dates', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '101st',
      '111th',
    ])
    expect(listOf([])).toBe('')
    expect(listOf(['A'])).toBe('A')
    expect(listOf(['A', 'B', 'C'])).toBe('A, B and C')
    expect(longDate('1988-05-15')).toBe('15 May 1988')
    expect(longDate('not a date')).toBe('not a date')
  })
})
