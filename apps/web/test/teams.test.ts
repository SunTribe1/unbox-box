import { describe, expect, it } from 'vitest'
import { colorDistance, duelColors, teamColor, teamKey } from '../src/lib/teams'

describe('team colors', () => {
  it('normalises sponsor-laden names', () => {
    expect(teamKey('Haas F1 Team')).toBe('haas')
    expect(teamKey('Stake F1 Team Kick Sauber')).toBe('kick sauber')
    expect(teamKey('Visa Cash App RB')).toBe('rb')
    expect(teamColor('Red Bull Racing', 'dark')).toBe('#4a7ff0')
    expect(teamColor('Unknown Racing', 'dark')).toBe('#9aa3ad')
  })

  it('keeps every team distinguishable from every other on dark', () => {
    const teams = [
      'Red Bull Racing',
      'Ferrari',
      'Mercedes',
      'McLaren',
      'Aston Martin',
      'Alpine',
      'Williams',
      'Racing Bulls',
      'Kick Sauber',
      'Haas F1 Team',
    ]
    for (const a of teams)
      for (const b of teams)
        if (a !== b)
          expect(
            colorDistance(teamColor(a, 'dark'), teamColor(b, 'dark')),
            `${a}/${b}`,
          ).toBeGreaterThan(60)
  })

  it('tints driver B when teammates share a color', () => {
    const mates = duelColors('McLaren', 'McLaren', 'dark')
    expect(mates.shared).toBe(true)
    expect(mates.a).not.toBe(mates.b)
    expect(colorDistance(mates.a, mates.b)).toBeGreaterThan(90)
    expect(duelColors('McLaren', 'Ferrari', 'dark')).toEqual({
      a: '#ff9a3c',
      b: '#ff3b4f',
      shared: false,
    })
  })
})

describe('cn', () => {
  it('keeps type-scale utilities next to text colors', async () => {
    const { cn } = await import('../src/lib/utils')
    expect(cn('text-label text-muted-foreground')).toBe('text-label text-muted-foreground')
    expect(cn('text-title', 'text-sm')).toBe('text-sm')
  })
})
