import { describe, expect, it } from 'vitest'
import { DECADES, eraLabel, eraRange } from '../src/lib/era'

describe('eras', () => {
  it('reads decades and spans', () => {
    expect(eraRange('1990s')).toEqual({ from: 1990, to: 1999 })
    expect(eraRange('2010-2026')).toEqual({ from: 2010, to: 2026 })
  })

  it('treats anything else as all time', () => {
    for (const bad of [undefined, 'all', '2026-2010', '19x0s', ''])
      expect(eraRange(bad)).toEqual({})
  })

  it('labels eras for people', () => {
    expect(eraLabel('1990s')).toBe('The 1990s')
    expect(eraLabel('2010-2026')).toBe('2010–2026')
    expect(eraLabel('all')).toBe('All time')
  })

  it('offers every decade since 1950, newest first', () => {
    expect(DECADES[0]).toBeGreaterThan(DECADES.at(-1)!)
    expect(DECADES.at(-1)).toBe(1950)
  })
})
