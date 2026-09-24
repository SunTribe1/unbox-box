import { describe, expect, it } from 'vitest'
import { compoundBg, compoundColor, compoundName } from '../src/lib/tyres'

describe('tyre compounds', () => {
  it('maps compounds to theme tokens', () => {
    expect(compoundColor('SOFT')).toBe('var(--tyre-soft)')
    expect(compoundColor('INTERMEDIATE')).toBe('var(--tyre-inter)')
    expect(compoundBg('WET')).toBe('bg-tyre-wet')
  })

  it('falls back to the neutral token for unknown or missing compounds', () => {
    expect(compoundColor('HYPERSOFT')).toBe('var(--even)')
    expect(compoundBg(null)).toBe('bg-even')
  })

  it('prints names in sentence case', () => {
    expect(compoundName('MEDIUM')).toBe('Medium')
  })
})
