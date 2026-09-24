import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CatalogSchema,
  RecordsSchema,
  SeasonArchiveSchema,
  familyOf,
  findWeekend,
  formatAge,
  formatMillis,
  makerProfile,
  nationProfile,
  nationSummaries,
  recordBoards,
  resolveHistoricDriver,
  resultTime,
  tyreWars,
  weekendHeadline,
  weekendSessions,
} from '../src'
import { DATA_DIR, loadHistory } from './context'

const read = (p: string) => JSON.parse(readFileSync(join(DATA_DIR, 'history', p), 'utf8'))
const data = loadHistory()
const catalog = CatalogSchema.parse(read('catalog.json'))
const driver = (q: string) => resolveHistoricDriver(data, q)
const name = (i: number) => data.index.drivers[i]!.name

describe('archive files', () => {
  it('parse against their schemas', () => {
    expect(() => RecordsSchema.parse(read('records.json'))).not.toThrow()
    for (const y of [1988, 2021, 2025]) {
      expect(() => SeasonArchiveSchema.parse(read(`seasons/${y}.json`))).not.toThrow()
    }
  })
})

describe('race weekends', () => {
  const season = SeasonArchiveSchema.parse(read('seasons/1988.json'))
  it('lists sessions with the result first', () => {
    const monaco = findWeekend(season, 3)!
    expect(monaco.name).toBe('Monaco')
    const sessions = weekendSessions(monaco)
    expect(sessions[0]).toBe('race')
    expect(sessions).toContain('qualifying')
    const head = weekendHeadline(monaco)
    expect(name(head.winner!.driver!)).toBe('Alain Prost')
    expect(name(head.pole!.driver!)).toBe('Ayrton Senna')
  })

  it('formats race times and gaps', () => {
    expect(formatMillis(5504742)).toBe('1:31:44.742')
    expect(formatMillis(81046)).toBe('1:21.046')
    expect(formatMillis(8757)).toBe('8.757')
    expect(resultTime({ gap: 22457 }, false)).toBe('+22.457')
    expect(resultTime({ gapLaps: 2 }, false)).toBe('+2 laps')
    expect(resultTime({ retired: 'Engine' }, false)).toBe('Engine')
  })
})

describe('record book', () => {
  it('ranks youngest winners and win streaks', () => {
    const boards = recordBoards(data, 'drivers')
    const youngest = boards.find((b) => b.id === 'youngest-winner')!
    expect(name(youngest.rows[0]!.subject)).toBe('Max Verstappen')
    expect(formatAge(youngest.rows[0]!.value)).toMatch(/^18y/)
    const streak = boards.find((b) => b.id === 'win-streak')!
    expect(name(streak.rows[0]!.subject)).toBe('Max Verstappen')
    expect(streak.rows[0]!.value).toBeGreaterThanOrEqual(10)
  })

  it('applies eras to team boards', () => {
    const nineties = recordBoards(data, 'teams', { from: 1990, to: 1999 })
    expect(data.index.constructors[nineties[0]!.rows[0]!.subject]!.name).toBe('Williams')
  })
})

describe('makers and nations', () => {
  it('builds an engine maker profile with eras and titles', () => {
    const honda = catalog.engineMakers.findIndex((m) => m.id === 'honda')
    const p = makerProfile(data, catalog, 'engine', honda)
    expect(p.titleYears).toContain(1988)
    expect(p.eras.some((e) => e.label.includes('V6 turbo'))).toBe(true)
    expect(tyreWars(catalog).length).toBeGreaterThan(70)
  })

  it('summarises nations and families', () => {
    const uk = nationSummaries(data, catalog).find((n) => n.code === 'GB')!
    expect(uk.titles).toBeGreaterThanOrEqual(20)
    const nl = nationProfile(data, catalog, 'NL')!
    expect(name(nl.drivers[0]!)).toBe('Max Verstappen')
    const damon = familyOf(data, catalog, driver('Damon Hill'))
    expect(damon).toEqual([{ driver: driver('Graham Hill'), relation: 'Father' }])
  })
})
