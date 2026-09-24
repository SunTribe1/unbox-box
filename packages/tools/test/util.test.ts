import { describe, expect, it } from 'vitest'
import { clamp, findDriver, findResult, stripAccents } from '../src'
import { loadMeta } from './context'

describe('shared utilities', () => {
  it('clamps into a range', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(clamp(2, 0, 3)).toBe(2)
  })

  it('strips accents without changing case', () => {
    expect(stripAccents('Pérez São Paulo')).toBe('Perez Sao Paulo')
  })

  it('finds a driver and their result by code', () => {
    const meta = loadMeta()
    const code = meta.results[0]!.driver
    expect(findDriver(meta, code)?.code).toBe(code)
    expect(findResult(meta, code)?.position).toBe(meta.results[0]!.position)
    expect(findDriver(meta, 'ZZZ')).toBeUndefined()
    expect(findResult(meta, 'ZZZ')).toBeUndefined()
  })
})
