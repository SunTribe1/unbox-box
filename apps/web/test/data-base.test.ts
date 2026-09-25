import { describe, expect, it, vi } from 'vitest'
import { resolveDataBase } from '../src/lib/data-base'

describe('data base', () => {
  it('uses the bundled data when unset or blank', () => {
    expect(resolveDataBase(undefined)).toBe('/data')
    expect(resolveDataBase('')).toBe('/data')
    expect(resolveDataBase('   ')).toBe('/data')
  })

  it('accepts a host or a path, without a trailing slash', () => {
    const hf = 'https://huggingface.co/datasets/me/unbox-box-data/resolve/main'
    expect(resolveDataBase(`${hf}/`)).toBe(hf)
    expect(resolveDataBase('http://localhost:4100')).toBe('http://localhost:4100')
    expect(resolveDataBase('/mirror/')).toBe('/mirror')
  })

  it('ignores anything else rather than breaking every page', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveDataBase('huggingface.co/datasets/x')).toBe('/data')
    expect(resolveDataBase('javascript:alert(1)')).toBe('/data')
    expect(resolveDataBase('//evil.example')).toBe('/data')
    expect(warn).toHaveBeenCalledTimes(3)
    warn.mockRestore()
  })
})
