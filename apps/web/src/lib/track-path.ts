/** Geometry shared by the Lap Duel map (SVG) and the replay map (canvas). */

export type Point = readonly [number, number]

/** Rotates circuit coordinates so the map matches the official orientation, and flips y
 *  (telemetry y grows north, screen y grows down). */
export function rotator(degrees: number): (x: number, y: number) => [number, number] {
  const a = (degrees * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return (x, y) => [x * cos - y * sin, -(x * sin + y * cos)]
}

const mid = (p: Point, q: Point): Point => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
const fmt = (p: Point) => `${p[0].toFixed(0)} ${p[1].toFixed(0)}`

/** An SVG path through `points` with every corner rounded: each point becomes the control
 *  point of a curve between the midpoints either side of it. The first and last points stay
 *  exact, so consecutive slices (sectors) still join. */
export function smoothSvgPath(points: readonly Point[]): string {
  if (points.length < 3) return points.map((p, i) => `${i ? 'L' : 'M'}${fmt(p)}`).join('')
  let d = `M${fmt(points[0]!)}`
  for (let i = 1; i < points.length - 1; i++) {
    d += `Q${fmt(points[i]!)} ${fmt(mid(points[i]!, points[i + 1]!))}`
  }
  return `${d}L${fmt(points.at(-1)!)}`
}

/** Adds a closed, corner-rounded loop through `points` to the canvas's current path. */
export function traceSmoothLoop(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  const n = points.length
  if (n < 3) return
  const start = mid(points[n - 1]!, points[0]!)
  ctx.moveTo(start[0], start[1])
  for (let i = 0; i < n; i++) {
    const end = mid(points[i]!, points[(i + 1) % n]!)
    ctx.quadraticCurveTo(points[i]![0], points[i]![1], end[0], end[1])
  }
  ctx.closePath()
}

/** The start/finish line: a short segment across the track at the first outline point,
 *  perpendicular to the direction of travel (a few points ahead, to ignore GPS jitter). */
export function startLine(points: readonly Point[], halfLength: number): [Point, Point] | null {
  const a = points[0]
  const b = points[Math.min(3, points.length - 1)]
  if (!a || !b) return null
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = (-dy / len) * halfLength
  const ny = (dx / len) * halfLength
  return [
    [a[0] + nx, a[1] + ny],
    [a[0] - nx, a[1] - ny],
  ]
}
