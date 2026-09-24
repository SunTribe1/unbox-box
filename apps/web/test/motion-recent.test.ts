import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enter, riseIn, stagger } from '../src/lib/motion'
import { newId, usePlayback, useHover } from '../src/lib/store'

describe('motion presets', () => {
  it('staggers children with the given step and delay', () => {
    expect(stagger(0.05, 0.1).show).toEqual({
      transition: { staggerChildren: 0.05, delayChildren: 0.1 },
    })
    expect(enter.variants).toBe(riseIn)
  })
})

describe('playback and hover stores', () => {
  it('never seeks before the start', () => {
    usePlayback.getState().seek(-5)
    expect(usePlayback.getState().time).toBe(0)
    usePlayback.getState().set({ playing: true, speed: 64 })
    usePlayback.getState().setFocus('VER')
    expect(usePlayback.getState()).toMatchObject({ playing: true, speed: 64, focus: 'VER' })
    useHover.getState().set(42)
    expect(useHover.getState().index).toBe(42)
  })

  it('makes unique message ids', () => {
    expect(new Set(Array.from({ length: 50 }, newId)).size).toBe(50)
  })
})

describe('recent sessions', () => {
  const store = new Map<string, string>()
  beforeEach(() => {
    store.clear()
    vi.resetModules()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('keeps the five most recent, newest first, without repeats', async () => {
    const { rememberSession } = await import('../src/lib/recent-sessions')
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'b']) rememberSession(id)
    expect(JSON.parse(store.get('unboxbox:recent-sessions')!)).toEqual(['b', 'f', 'e', 'd', 'c'])
  })

  it('survives blocked storage', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    const { rememberSession } = await import('../src/lib/recent-sessions')
    expect(() => rememberSession('a')).not.toThrow()
  })
})
