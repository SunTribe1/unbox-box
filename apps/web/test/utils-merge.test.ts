import { describe, expect, it } from 'vitest'
import { cn } from '../src/lib/utils'

describe('cn', () => {
  it('keeps the type-scale utilities alongside a text colour', () => {
    for (const size of [
      'title',
      'caption',
      'label',
      'hero',
      'headline',
      'subhead',
      'lead',
      'eyebrow',
    ]) {
      expect(cn(`text-${size}`, 'text-white/70')).toBe(`text-${size} text-white/70`)
    }
  })

  it('still lets a later size replace an earlier one', () => {
    expect(cn('text-eyebrow', 'text-sm')).toBe('text-sm')
  })
})
