import { describe, expect, it } from 'vitest'
import { rotator, smoothSvgPath } from '../src/lib/track-path'

describe('track path', () => {
  it('rounds every corner but keeps the end points exact, so sector slices join', () => {
    const d = smoothSvgPath([
      [0, 0],
      [10, 0],
      [10, 10],
      [20, 10],
    ])
    expect(d).toBe('M0 0Q10 0 10 5Q10 10 15 10L20 10')
  })

  it('draws a plain line when there are too few points to curve', () => {
    expect(
      smoothSvgPath([
        [0, 0],
        [5, 5],
      ]),
    ).toBe('M0 0L5 5')
  })

  it('rotates and flips y for the screen', () => {
    const [x, y] = rotator(90)(1, 0)
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(-1)
  })
})

describe('start line', () => {
  it('crosses the track at right angles, whatever direction the straight runs', async () => {
    const { startLine } = await import('../src/lib/track-path')
    const diagonal: [number, number][] = [0, 1, 2, 3].map((i) => [i, i])
    const [a, b] = startLine(diagonal, 2)!
    const dot = (b[0] - a[0]) * 1 + (b[1] - a[1]) * 1
    expect(dot).toBeCloseTo(0)
    expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeCloseTo(4)
  })
})
