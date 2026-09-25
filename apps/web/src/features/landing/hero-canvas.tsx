'use client'

import { useQuery } from '@tanstack/react-query'
import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { circuitShapesQuery } from '@/lib/data'

type Point = [number, number]

/** The hero's backdrop: a real circuit outline from the data, drawn as a halftone field (dots
 *  swell near the track) with a dashed orbit, and a car of red light lapping it. The car slows
 *  into corners, because its speed follows the track's curvature. The static layer is drawn
 *  once per resize; each frame only adds the car. */
export function HeroCanvas({ circuit = 'monza' }: { circuit?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()
  const shapes = useQuery(circuitShapesQuery())
  const shape = shapes.data?.[circuit]

  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx || !shape || shape.x.length < 3) return
    const path = rotate(
      shape.x.map((x, i): Point => [x, shape.y[i] ?? 0]),
      shape.rotation,
    )
    const pace = paceAlong(path)
    let frame = 0
    let visible = true
    let t = 0
    let last = performance.now()

    const layer = document.createElement('canvas')
    let fit: Fit = { scale: 1, dx: 0, dy: 0 }
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const [w, h] = [el.clientWidth, el.clientHeight]
      for (const c of [el, layer]) {
        c.width = w * dpr
        c.height = h * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      fit = fitTo(path, w, h)
      const layerCtx = layer.getContext('2d')
      if (layerCtx) {
        layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
        drawField(layerCtx, path, fit, w, h)
      }
    }
    size()
    const observer = new ResizeObserver(size)
    observer.observe(el)
    const seen = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting
    })
    seen.observe(el)

    const draw = (now: number) => {
      const [w, h] = [el.clientWidth, el.clientHeight]
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(layer, 0, 0, w, h)
      if (reduce) {
        drawTrail(ctx, path, fit, path.length * 0.35, Math.round(path.length * 0.28))
      } else {
        // One lap in about nine seconds at the track's average pace. The first frame's clock
        // can read slightly earlier than setup, so time never runs backwards.
        const dt = Math.max(0, now - last) / 1000
        t = (t + dt * (path.length / 9) * (pace[wrap(t, path.length)] ?? 1)) % path.length
        drawTrail(ctx, path, fit, t, Math.round(path.length * 0.28))
      }
      last = now
    }

    const loop = (now: number) => {
      if (visible && !document.hidden) draw(now)
      else last = now
      frame = requestAnimationFrame(loop)
    }
    if (reduce) draw(performance.now())
    else frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      seen.disconnect()
    }
  }, [shape, reduce])

  return <canvas ref={canvas} aria-hidden className="absolute inset-0 size-full" />
}

interface Fit {
  scale: number
  dx: number
  dy: number
}

function rotate(path: Point[], degrees: number): Point[] {
  const a = (degrees * Math.PI) / 180
  const [c, s] = [Math.cos(a), Math.sin(a)]
  // Screen y points down; the data's y points up.
  return path.map(([x, y]) => [x * c - y * s, -(x * s + y * c)])
}

/** The content column the page's text sits in (max-w-6xl with its padding). */
const CONTENT = { max: 1152, pad: 32 }
/** The orbit ring's radius, relative to the circuit's half-extent. */
const ORBIT = 1.08

/** Fit the circuit and its orbit inside the content column: the right half on wide screens,
 *  below the text on narrow ones. Never outside the column. */
function fitTo(path: Point[], w: number, h: number): Fit {
  const xs = path.map((p) => p[0])
  const ys = path.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ]
  const inner = Math.min(w, CONTENT.max)
  const left = (w - inner) / 2 + (w < 640 ? 20 : CONTENT.pad)
  const right = (w + inner) / 2 - (w < 640 ? 20 : CONTENT.pad)
  const wide = w >= 1024
  // Narrow screens: the hero leaves a band below the stats for the circuit (hero.tsx).
  const band = Math.min(w * 0.92, 390)
  const box = wide
    ? { x0: left + (right - left) * 0.47, x1: right, y0: h * 0.08, y1: h * 0.92 }
    : { x0: left, x1: right, y0: h - band + 12, y1: h - 16 }
  // The orbit is a circle round the larger extent, so fit that circle in the box.
  const diameter = Math.max(maxX - minX, maxY - minY) * ORBIT
  const scale = Math.min(box.x1 - box.x0, box.y1 - box.y0) / diameter
  const cx = (box.x0 + box.x1) / 2
  const cy = (box.y0 + box.y1) / 2
  return {
    scale,
    dx: cx - ((minX + maxX) / 2) * scale,
    dy: cy - ((minY + maxY) / 2) * scale,
  }
}

/** An index into a closed path, always in range. */
const wrap = (i: number, n: number) => ((Math.floor(i) % n) + n) % n

const at = (p: Point, f: Fit): Point => [p[0] * f.scale + f.dx, p[1] * f.scale + f.dy]

/** Relative speed at each point: slower where the track bends hardest. */
function paceAlong(path: Point[]): number[] {
  const n = path.length
  const bend = path.map((_, i) => {
    const a = path[(i - 2 + n) % n]!
    const b = path[i]!
    const c = path[(i + 2) % n]!
    const t1 = Math.atan2(b[1] - a[1], b[0] - a[0])
    const t2 = Math.atan2(c[1] - b[1], c[0] - b[0])
    return Math.abs(Math.atan2(Math.sin(t2 - t1), Math.cos(t2 - t1)))
  })
  const max = Math.max(...bend, 1e-6)
  return bend.map((b) => 1.35 - 0.9 * (b / max))
}

const DOT_STEP = 10

/** Halftone dots, a dotted circuit and a dashed orbit: everything that does not move. */
function drawField(ctx: CanvasRenderingContext2D, path: Point[], f: Fit, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  const screen = path.map((p) => at(p, f))
  // Dots grow and brighten with closeness to the track.
  for (let y = DOT_STEP / 2; y < h; y += DOT_STEP) {
    for (let x = DOT_STEP / 2; x < w; x += DOT_STEP) {
      const near = Math.exp(-distanceTo(screen, x, y) / 46)
      const r = 0.55 + 1.9 * near
      ctx.fillStyle = `rgba(255,255,255,${0.05 + 0.42 * near})`
      ctx.fillRect(x - r / 2, y - r / 2, r, r)
    }
  }
  // The circuit itself, as a line of dots.
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  for (let i = 0; i < screen.length; i++) {
    const [x1, y1] = screen[i]!
    const [x2, y2] = screen[(i + 1) % screen.length]!
    const steps = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 4))
    for (let k = 0; k < steps; k++) {
      ctx.fillRect(x1 + ((x2 - x1) * k) / steps - 1, y1 + ((y2 - y1) * k) / steps - 1, 2, 2)
    }
  }
  // A dashed orbit around the circuit.
  const xs = screen.map((p) => p[0])
  const ys = screen.map((p) => p[1])
  const [cx, cy] = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
  ]
  const radius =
    (Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2) * ORBIT
  ctx.setLineDash([3, 9])
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
}

/** Shortest distance from a point to the closed polyline. */
function distanceTo(poly: Point[], x: number, y: number): number {
  let best = Infinity
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i]!
    const [bx, by] = poly[(i + 1) % poly.length]!
    const [dx, dy] = [bx - ax, by - ay]
    const len = dx * dx + dy * dy || 1
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len))
    best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)))
  }
  return best
}

/** The car and its light trail: `head` is a fractional index into the path. */
function drawTrail(
  ctx: CanvasRenderingContext2D,
  path: Point[],
  f: Fit,
  head: number,
  length: number,
) {
  const n = path.length
  ctx.lineCap = 'round'
  for (let k = length; k > 0; k--) {
    const a = path[wrap(head - k, n)]!
    const b = path[wrap(head - k + 1, n)]!
    const fade = 1 - k / length
    const [x1, y1] = at(a, f)
    const [x2, y2] = at(b, f)
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = `rgba(230,36,36,${0.9 * fade * fade})`
    ctx.lineWidth = 1 + 3 * fade
    ctx.shadowColor = 'rgba(230,36,36,0.8)'
    ctx.shadowBlur = 16 * fade
    ctx.stroke()
  }
  const [x, y] = at(path[wrap(head, n)]!, f)
  ctx.shadowBlur = 24
  ctx.fillStyle = '#ffd7d4'
  ctx.beginPath()
  ctx.arc(x, y, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}
