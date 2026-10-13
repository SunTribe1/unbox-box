import { describe, expect, it } from 'vitest'
import { paintRadialGlow, stopAlpha } from '../src/lib/dither'

const BG: [number, number, number] = [8, 9, 11]
const RED: [number, number, number] = [229, 50, 45]

describe('dithered radial glow', () => {
  it('reads alpha off the stops, linear between them and flat past the ends', () => {
    const stops: [number, number][] = [
      [0, 0.2],
      [0.7, 0],
    ]
    expect(stopAlpha(stops, 0)).toBeCloseTo(0.2)
    expect(stopAlpha(stops, 0.35)).toBeCloseTo(0.1)
    expect(stopAlpha(stops, 0.7)).toBe(0)
    expect(stopAlpha(stops, 2)).toBe(0)
    expect(stopAlpha(stops, -1)).toBeCloseTo(0.2)
  })

  it('paints opaque pixels: the glow at the centre, the background outside it', () => {
    const [w, h] = [10, 10]
    const data = new Uint8ClampedArray(w * h * 4)
    paintRadialGlow(data, w, h, {
      background: BG,
      color: RED,
      center: [5.5, 5.5],
      radius: [5, 5],
      stops: [
        [0, 1],
        [0.5, 0],
      ],
      random: () => 0.5,
    })
    const at = (x: number, y: number) =>
      Array.from(data.slice((y * w + x) * 4, (y * w + x) * 4 + 4))
    expect(at(5, 5)).toEqual([...RED, 255])
    expect(at(0, 0)).toEqual([...BG, 255])
  })

  it('dithers: a shallow ramp mixes neighbouring levels instead of stepping between them', () => {
    // 1000 px from level 8 to level 10: without dither, two hard steps. With it, every column
    // near a step holds a mix of both levels, and the average still follows the ramp.
    const [w, h] = [1000, 40]
    const data = new Uint8ClampedArray(w * h * 4)
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    paintRadialGlow(data, w, h, {
      background: [8, 8, 8],
      color: [10, 10, 10],
      center: [0, 20],
      radius: [1000, 1e9],
      stops: [
        [0, 0],
        [1, 1],
      ],
      random,
    })
    const column = (x: number) => Array.from({ length: h }, (_, y) => data[(y * w + x) * 4] ?? 0)
    const mean = (x: number) => column(x).reduce((a, b) => a + b, 0) / h
    expect(new Set(column(250)).size).toBeGreaterThan(1)
    expect(mean(250)).toBeGreaterThan(8.2)
    expect(mean(250)).toBeLessThan(8.8)
    expect(mean(750)).toBeGreaterThan(9.2)
    expect(mean(750)).toBeLessThan(9.8)
  })
})
