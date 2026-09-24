import { describe, expect, it } from 'vitest'
import { circuitProfile } from '../src'
import { loadHistory } from './context'

const data = loadHistory()
const circuit = (id: string) => data.index.circuits.findIndex((c) => c.id === id)
const name = (i: number) => data.index.drivers[i]!.name

describe('circuit profiles', () => {
  it('knows Monza: races, kings, lap record', () => {
    const p = circuitProfile(data, circuit('monza'), new Date('2026-09-24'))
    expect(p.firstYear).toBe(1950)
    expect(p.races).toBeGreaterThan(70)
    expect(p.topDrivers[0]!.wins).toBeGreaterThanOrEqual(5)
    expect(data.index.constructors[p.topTeams[0]!.constructor]!.name).toBe('Ferrari')
    expect(p.record?.time).toBeCloseTo(80.901, 3)
    expect(name(p.record!.driver)).toBe('Lando Norris')
    expect(p.poleToWin).toBeGreaterThan(0.2)
    expect(p.poleToWin).toBeLessThan(0.8)
  })

  it('finds the next visit from the calendar', () => {
    const p = circuitProfile(data, circuit('yas-marina'), new Date('2026-09-24'))
    expect(p.next?.date).toBe('2026-12-06')
  })
})
