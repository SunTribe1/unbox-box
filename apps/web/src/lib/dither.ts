/** Soft light without banding. Chrome draws CSS gradients in plain 8-bit steps, so a faint glow
 *  over near-black shows as rings with hard edges (Safari dithers, so it looks smooth there).
 *  Painting the glow per pixel with half a level of random noise mixes neighbouring levels
 *  instead, which the eye reads as a smooth ramp in every browser. */

export type Rgb = readonly [number, number, number]
/** [position along the radius (0 centre, 1 edge), alpha 0–1], in ascending position order. */
export type Stop = readonly [number, number]

export interface RadialGlow {
  /** Opaque colour under the glow (the page background). */
  background: Rgb
  color: Rgb
  /** Centre and radii in pixels; unequal radii make an ellipse. */
  center: readonly [number, number]
  radius: readonly [number, number]
  stops: readonly Stop[]
  /** Noise source, [0, 1). Injectable so tests are deterministic. */
  random?: () => number
}

/** Alpha at `t` along the radius: linear between stops, flat beyond the first and last. */
export function stopAlpha(stops: readonly Stop[], t: number): number {
  const first = stops[0]
  const last = stops[stops.length - 1]
  if (!first || !last) return 0
  if (t <= first[0]) return first[1]
  if (t >= last[0]) return last[1]
  for (let i = 1; i < stops.length; i++) {
    const [t1, a1] = stops[i]!
    const [t0, a0] = stops[i - 1]!
    if (t <= t1) return a0 + ((a1 - a0) * (t - t0)) / (t1 - t0 || 1)
  }
  return last[1]
}

/** Fills `data` (RGBA, `w`×`h`) with the glow composited over the background, opaque and
 *  dithered, ready for `putImageData`. */
export function paintRadialGlow(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  glow: RadialGlow,
): void {
  const { background: bg, color, center, radius, stops, random = Math.random } = glow
  const [cx, cy] = center
  const [rx, ry] = [radius[0] || 1, radius[1] || 1]
  for (let y = 0; y < h; y++) {
    const dy = (y + 0.5 - cy) / ry
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - cx) / rx
      const a = stopAlpha(stops, Math.sqrt(dx * dx + dy * dy))
      const i = (y * w + x) * 4
      // One noise value per pixel for all three channels keeps the grain colourless.
      const noise = random() - 0.5
      for (let c = 0; c < 3; c++) {
        data[i + c] = Math.round(bg[c]! + a * (color[c]! - bg[c]!) + noise)
      }
      data[i + 3] = 255
    }
  }
}
