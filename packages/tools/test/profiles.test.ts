import { describe, expect, it } from 'vitest'
import {
  championshipProgression,
  driverProfile,
  gridToFlag,
  resolveHistoricDriver,
  teamProfile,
} from '../src'
import { loadHistory, loadStandings } from './context'

const data = loadHistory()
const standings = loadStandings()
const driver = (q: string) => resolveHistoricDriver(data, q)
const team = (id: string) => data.index.constructors.findIndex((c) => c.id === id)
const name = (i: number) => data.index.drivers[i]!.name

describe('driver profiles', () => {
  const msc = driverProfile(data, driver('Michael Schumacher'), standings)

  it('reads a career like a CV: every team, in order', () => {
    expect(msc.teams.map((t) => t.name)).toEqual(['Jordan', 'Benetton', 'Ferrari', 'Mercedes'])
    expect(msc.teams.reduce((n, t) => n + t.wins, 0)).toBe(91)
  })

  it('knows each final championship position', () => {
    const titles = msc.seasons.filter((s) => s.position === 1).map((s) => s.year)
    expect(titles).toEqual([1994, 1995, 2000, 2001, 2002, 2003, 2004])
    expect(msc.seasons.find((s) => s.year === 2000)?.teams).toEqual(['Ferrari'])
  })

  it('works out rates, favourite circuits and teammates', () => {
    expect(msc.rates.win).toBeCloseTo(91 / 306, 2)
    expect(msc.bestCircuits[0]!.wins).toBeGreaterThanOrEqual(8)
    expect(name(msc.teammates[0]!.driver)).toBe('Rubens Barrichello')
    expect(msc.firstWin).not.toBeNull()
    expect(msc.bestComeback!.grid).toBeGreaterThan(msc.bestComeback!.pos)
  })
})

describe('signature teams', () => {
  it('picks the team a driver won most with', async () => {
    const { signatureTeam } = await import('../src')
    const senna = signatureTeam(data, driver('Ayrton Senna'))!
    expect(data.index.constructors[senna]!.name).toBe('McLaren')
  })
})

describe('team profiles', () => {
  it('follows a team through every name it raced under', () => {
    const alpine = teamProfile(data, team('alpine'), standings)
    expect(alpine.lineage.map((l) => l.name)).toEqual([
      'Toleman',
      'Benetton',
      'Renault',
      'Lotus',
      'Renault',
      'Alpine',
    ])
    // Benetton 1995, Renault 2005 and 2006; Renault's 1977-85 works team is a different line.
    expect(alpine.combined?.titles).toBe(3)
    expect(alpine.combined!.wins).toBeGreaterThan(40)
  })

  it('lists seasons, titles and the drivers who won them', () => {
    const ferrari = teamProfile(data, team('ferrari'), standings)
    expect(ferrari.seasons[0]!.year).toBe(1950)
    expect(ferrari.seasons.find((s) => s.year === 2004)).toMatchObject({
      champion: true,
      position: 1,
    })
    const msc = driver('Michael Schumacher')
    expect(ferrari.driverTitles.filter((t) => t.driver === msc).map((t) => t.year)).toEqual([
      2000, 2001, 2002, 2003, 2004,
    ])
    expect(ferrari.drivers[0]!.starts).toBeGreaterThan(150)
  })
})

describe('championship progression', () => {
  it('matches the official 2021 table, sprints included', () => {
    const p = championshipProgression(data, standings, 2021, 'drivers')
    expect(p.rounds).toHaveLength(22)
    const [first, second] = p.rows
    expect(name(first!.id)).toBe('Max Verstappen')
    expect(first!.points.at(-1)).toBe(395.5)
    expect(name(second!.id)).toBe('Lewis Hamilton')
    expect(second!.points.at(-1)).toBe(387.5)
  })

  it('covers constructors too', () => {
    const p = championshipProgression(data, standings, 2021, 'constructors')
    expect(data.index.constructors[p.rows[0]!.id]!.name).toBe('Mercedes')
  })
})

describe('grid to flag', () => {
  it('ranks the biggest gains first and never credits a retirement', () => {
    const race = data.index.races.year.lastIndexOf(2025)
    const rows = gridToFlag(data, race)
    expect(rows.length).toBeGreaterThan(15)
    const gains = rows.filter((r) => r.gained != null).map((r) => r.gained!)
    expect(gains).toEqual([...gains].sort((a, b) => b - a))
    for (const r of rows) if (r.gained != null) expect(r.gained).toBe(r.grid - r.pos)
  })
})

describe('profile tools', () => {
  it('the engine routes plain questions to the profiles and the championship', async () => {
    const { createTestContext, loadMeta } = await import('./context')
    const { parse, runCalls } = await import('../src')
    const ctx = createTestContext()
    const meta = loadMeta()
    const state = ctx.getState()
    const ask = (q: string) => {
      const plan = parse(q, meta, state)
      if (plan.kind !== 'calls') throw new Error(`no plan for ${q}`)
      return plan.calls
    }
    expect(ask('the 2021 title fight')[0]).toMatchObject({
      tool: 'championship',
      input: { season: 2021, kind: 'drivers' },
    })
    expect(ask('1998 constructors championship')[0]!.input).toMatchObject({ kind: 'constructors' })
    expect(ask('ferrari history')[0]).toMatchObject({
      tool: 'team_profile',
      input: { team: 'ferrari' },
    })
    expect(ask('tell me about jim clark')[0]).toMatchObject({ tool: 'driver_profile' })

    const out = await runCalls(ask('the 2021 title fight'), ctx)
    expect(out.at(-1)!.result?.text ?? out.at(-1)!.error).toMatch(
      /champion: Max Verstappen on 395\.5 points, 8 ahead of Lewis Hamilton/,
    )
    const team = await runCalls(ask('alpine team history'), ctx)
    expect(team.at(-1)!.result?.text ?? team.at(-1)!.error).toMatch(/Toleman .*→ Benetton/)
  })
})
