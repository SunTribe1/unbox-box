import { describe, expect, it } from 'vitest'
import { formatEventDate } from '../src/lib/format'

describe('formatEventDate', () => {
  it('prints the day in British order, in any time zone', () => {
    expect(formatEventDate('2026-09-06')).toBe('6 Sept 2026')
    expect(formatEventDate('2026-09-06', { year: false })).toBe('6 Sept')
  })

  it('prints nothing for a missing date', () => {
    expect(formatEventDate(null)).toBe('')
  })
})
