'use client'

import { useQuery } from '@tanstack/react-query'
import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { circuitShapesQuery } from '@/lib/data'

type Point = [number, number]

/** The hero's backdrop: a real circuit outline from the data, drawn as a halftone field (dots
 *  swell near the track) with a dashed orbit, and a car of red light lapping it. The car slows
 *  into corners, because its speed follows the track's curvature.
 *
 *  No canvas covers the hero. Chrome on macOS composited the old full-hero canvases with a
 *  hard, lighter band across the lower quarter of the screen on some displays, so:
 *  - the static field is drawn once per resize off screen and shown as a plain image;
 *  - the car gets a canvas only as big as the orbit around the track.
 *  The bottom fade and the clearing behind the headline are painted into the pixels (no CSS
 *  mask or gradient layer: Chrome draws a faint gradient on near-black in visible steps). */
export function HeroCanvas({ circuit = 'monza' }: { circuit?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const car = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()
  const shapes = useQuery(circuitShapesQuery())
  const shape = shapes.data?.[circuit]

  useEffect(() => {
    const [boxEl, imageEl, carEl] = [box.current, image.current, car.current]
    const ctx = carEl?.getContext('2d')
    if (!boxEl || !imageEl || !carEl || !ctx || !shape || shape.x.length < 3) return
    const path = rotate(
      shape.x.map((x, i): Point => [x, shape.y[i] ?? 0]),
      shape.rotation,
    )
    const pace = paceAlong(path)
    let frame = 0
    let visible = true
    let t = 0
    let last = performance.now()
    let fit: Fit = { scale: 1, dx: 0, dy: 0 }
    let [w, h] = [0, 0]
    let area: Rect = { x: 0, y: 0, w: 0, h: 0 }
    let url = ''
    let generation = 0

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      ;[w, h] = [boxEl.clientWidth, boxEl.clientHeight]
      if (!w || !h) return
      fit = fitTo(path, w, h)
      paintField(path, fit, w, h, dpr, ++generation)
      // The car's canvas covers the orbit and a margin for its glow, nothing more.
      area = carArea(
        path.map((p) => at(p, fit)),
        w,
        h,
      )
      Object.assign(carEl.style, {
        left: `${area.x}px`,
        top: `${area.y}px`,
        width: `${area.w}px`,
        height: `${area.h}px`,
      })
      carEl.width = Math.round(area.w * dpr)
      carEl.height = Math.round(area.h * dpr)
      // Draw in hero coordinates; the transform moves them into the canvas.
      ctx.setTransform(dpr, 0, 0, dpr, -area.x * dpr, -area.y * dpr)
    }

    /** Draws the field off screen and swaps it into the image when the bitmap is ready. */
    const paintField = (p: Point[], f: Fit, fw: number, fh: number, dpr: number, gen: number) => {
      const offscreen = document.createElement('canvas')
      offscreen.width = Math.round(fw * dpr)
      offscreen.height = Math.round(fh * dpr)
      const fieldCtx = offscreen.getContext('2d')
      if (!fieldCtx) return
      fieldCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      drawField(fieldCtx, p, f, fw, fh)
      fadeBottom(fieldCtx, fw, fh)
      clearBehindText(fieldCtx, fw, fh)
      offscreen.toBlob((blob) => {
        // A later resize may have started a newer field; keep only the latest.
        if (!blob || gen !== generation) return
        const next = URL.createObjectURL(blob)
        imageEl.src = next
        if (url) URL.revokeObjectURL(url)
        url = next
      })
    }

    size()
    const observer = new ResizeObserver(size)
    observer.observe(boxEl)
    const seen = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting
    })
    seen.observe(boxEl)

    const draw = (now: number) => {
      ctx.clearRect(area.x, area.y, area.w, area.h)
      if (reduce) {
        drawTrail(ctx, path, fit, path.length * 0.35, Math.round(path.length * 0.28))
      } else {
        // One lap in about nine seconds at the track's average pace. The first frame's clock
        // can read slightly earlier than setup, so time never runs backwards.
        const dt = Math.max(0, now - last) / 1000
        t = (t + dt * (path.length / 9) * (pace[wrap(t, path.length)] ?? 1)) % path.length
        drawTrail(ctx, path, fit, t, Math.round(path.length * 0.28))
      }
      fadeBottom(ctx, w, h)
      clearBehindText(ctx, w, h)
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
      generation++
      if (url) URL.revokeObjectURL(url)
    }
  }, [shape, reduce])

  return (
    <div ref={box} aria-hidden className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- a runtime-drawn bitmap */}
      <img ref={image} alt="" className="absolute inset-0 size-full" />
      <canvas ref={car} className="absolute" />
    </div>
  )
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** The orbit's bounding box plus room for the car's glow, kept inside the hero. */
function carArea(screen: Point[], w: number, h: number): Rect {
  const { cx, cy, radius } = orbitOf(screen)
  const pad = 32
  const x = Math.max(0, Math.floor(cx - radius - pad))
  const y = Math.max(0, Math.floor(cy - radius - pad))
  return {
    x,
    y,
    w: Math.min(w, Math.ceil(cx + radius + pad)) - x,
    h: Math.min(h, Math.ceil(cy + radius + pad)) - y,
  }
}

/** Fades the lowest 30% of a layer to transparent, as the old CSS mask did. */
function fadeBottom(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fade = ctx.createLinearGradient(0, h * 0.7, 0, h)
  fade.addColorStop(0, 'rgba(0,0,0,1)')
  fade.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

/** Erases the field behind the headline: fully clear near the text, fading back in towards the
 *  track. An ellipse at 12% / 55% with radii of 90% × 75% of the hero, clear to 30% of the way
 *  out, untouched from 72%. Only the sparse dots and lines are affected, so no banding shows. */
function clearBehindText(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const clear = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  clear.addColorStop(0.3, 'rgba(0,0,0,1)')
  clear.addColorStop(0.72, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.translate(w * 0.12, h * 0.55)
  ctx.scale(w * 0.9, h * 0.75)
  ctx.fillStyle = clear
  ctx.fillRect(-2, -2, 4, 4)
  ctx.restore()
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
  const { cx, cy, radius } = orbitOf(screen)
  ctx.setLineDash([3, 9])
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
}

/** The dashed orbit: a circle round the circuit's on-screen extent. */
function orbitOf(screen: Point[]): { cx: number; cy: number; radius: number } {
  const xs = screen.map((p) => p[0])
  const ys = screen.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ]
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    radius: (Math.max(maxX - minX, maxY - minY) / 2) * ORBIT,
  }
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

/** The car and its light trail: `head` is a fractional index into the path. The glow is a wide,
 *  faint stroke under a thin bright one (cheap); only the car itself gets a real blur. */
function drawTrail(
  ctx: CanvasRenderingContext2D,
  path: Point[],
  f: Fit,
  head: number,
  length: number,
) {
  const n = path.length
  ctx.lineCap = 'round'
  for (const glow of [true, false]) {
    for (let k = length; k > 0; k--) {
      const [x1, y1] = at(path[wrap(head - k, n)]!, f)
      const [x2, y2] = at(path[wrap(head - k + 1, n)]!, f)
      const fade = 1 - k / length
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = glow
        ? `rgba(230,36,36,${0.16 * fade * fade})`
        : `rgba(230,36,36,${0.9 * fade * fade})`
      ctx.lineWidth = glow ? 4 + 10 * fade : 1 + 3 * fade
      ctx.stroke()
    }
  }
  const [x, y] = at(path[wrap(head, n)]!, f)
  ctx.shadowColor = 'rgba(230,36,36,0.8)'
  ctx.shadowBlur = 24
  ctx.fillStyle = '#ffd7d4'
  ctx.beginPath()
  ctx.arc(x, y, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}
