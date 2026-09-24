'use client'

import { clamp, progressAt, stateAt } from '@unbox-box/tools'
import { useTheme } from 'next-themes'
import { useEffect, useRef } from 'react'
import { rotator, startLine, traceSmoothLoop } from '@/lib/track-path'
import type { RaceData } from '@/lib/types'
import { useApp, usePlayback } from '@/lib/store'
import { useDriverColor } from '@/lib/use-team-colors'
import { cssVar } from '@/lib/utils'
import { INK } from '@/lib/brand'

/** Every car on track, drawn on a canvas each frame from the replay clock. Cars sit exactly
 *  on the outline because their position is progress around the lap, not raw x/y. */
interface Rect {
  x: number
  y: number
  w: number
  h: number
}

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w + 2 && b.x < a.x + a.w + 2 && a.y < b.y + b.h + 1 && b.y < a.y + a.h + 1

/** Black or white text, whichever reads better on a team-color pill. */
function readableOn(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? INK.dark : INK.light
}

export function TrackCanvas({ meta, replay }: RaceData) {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()
  const duel = useApp((s) => s.duel)
  const colorOf = useDriverColor()

  useEffect(() => {
    const el = canvas.current
    const box = host.current
    if (!el || !box) return
    const ctx = el.getContext('2d')
    if (!ctx) return

    const rotate = rotator(meta.circuit.rotation)
    const pts = meta.track.x.map((x, i) => rotate(x, meta.track.y[i] ?? 0))
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const outlineStep = meta.telemetry.length / pts.length

    const colors = {
      track: cssVar('--surface-3'),
      edge: cssVar('--border'),
      car: cssVar('--foreground'),
      label: cssVar('--muted-foreground'),
      surface: cssVar('--surface-1'),
      a: cssVar('--driver-a'),
      b: cssVar('--driver-b'),
      signal: cssVar('--signal'),
      faint: cssVar('--faint-foreground'),
    }
    const mono = cssVar('--font-mono') || 'monospace'

    let scale = 1
    let ox = 0
    let oy = 0
    let dpr = 1
    const toScreen = (x: number, y: number): [number, number] => [
      ox + (x - minX) * scale,
      oy + (y - minY) * scale,
    ]

    const resize = () => {
      dpr = window.devicePixelRatio || 1
      const w = box.clientWidth
      const h = box.clientHeight
      el.width = Math.round(w * dpr)
      el.height = Math.round(h * dpr)
      el.style.width = `${w}px`
      el.style.height = `${h}px`
      const pad = 52 // room outside the circuit for callout labels
      scale = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY))
      ox = (w - (maxX - minX) * scale) / 2
      oy = (h - (maxY - minY) * scale) / 2
    }

    const pointAt = (progress: number): [number, number] => {
      const frac = progress - Math.floor(progress)
      const f = (frac * meta.telemetry.length) / outlineStep
      const i = Math.floor(f) % pts.length
      const j = (i + 1) % pts.length
      const t = f - Math.floor(f)
      const p = pts[i]!
      const q = pts[j]!
      return toScreen(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
    }

    // Outward direction at a point on the lap. The track's traversal direction decides
    // which normal points outside; it's calibrated once at the leftmost point, whose outside
    // must face left, so it stays right through concave corners too.
    const normalAt = (progress: number): [number, number] => {
      const [ax, ay] = pointAt(progress - 0.003)
      const [bx, by] = pointAt(progress + 0.003)
      const len = Math.hypot(bx - ax, by - ay) || 1
      return [(by - ay) / len, -(bx - ax) / len]
    }
    const leftmost = xs.indexOf(minX)
    const side = normalAt((leftmost * outlineStep) / meta.telemetry.length)[0] > 0 ? -1 : 1
    const outwardAt = (progress: number): [number, number] => {
      const [nx, ny] = normalAt(progress)
      return [nx * side, ny * side]
    }

    // Callouts keep their spot between frames and glide to a new one only when it's blocked,
    // so at 4x/16x they move with their car instead of hopping between candidate spots.
    // Plain codes fade in and out rather than flicker.
    const EASE = 0.22 // share of the remaining distance covered per frame (~200 ms to settle)
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(draw)
    }
    const pillMemo = new Map<string, { idx: number; ox: number; oy: number }>()
    const labelAlpha = new Map<string, number>()

    const draw = () => {
      let settling = false
      const w = el.width / dpr
      const h = el.height / dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      // Track: wide base, then a thin edge line.
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.beginPath()
      traceSmoothLoop(
        ctx,
        pts.map(([x, y]) => toScreen(x, y)),
      )
      ctx.strokeStyle = colors.track
      ctx.lineWidth = 14
      ctx.stroke()
      ctx.strokeStyle = colors.edge
      ctx.lineWidth = 1
      ctx.stroke()

      // Start / finish.
      const line = startLine(
        pts.map(([x, y]) => toScreen(x, y)),
        9,
      )
      if (line) {
        ctx.beginPath()
        ctx.moveTo(line[0][0], line[0][1])
        ctx.lineTo(line[1][0], line[1][1])
        ctx.strokeStyle = colors.car
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.stroke()
      }

      const { time, focus } = usePlayback.getState()
      const drivers = Object.keys(replay.progress)
      const cars = drivers
        .map((d) => ({ d, state: stateAt(replay, d, time), p: progressAt(replay, d, time) }))
        .filter((c) => c.state !== 'dns' && c.state !== 'out' && c.p > 0)
        .sort((x, y) => x.p - y.p) // draw the leader last (on top)
      const leader = cars.at(-1)?.d

      ctx.font = `600 10px ${mono}`
      ctx.textBaseline = 'middle'
      // Dots first (highlighted cars last, so they sit on top), then labels over everything.
      // Emphasis lives in the label, not in a halo that would cover neighbouring cars.
      const isHighlighted = (d: string) => d === duel?.a || d === duel?.b || d === focus
      const drawOrder = [...cars].sort(
        (p, q) => Number(isHighlighted(p.d)) - Number(isHighlighted(q.d)),
      )
      for (const car of drawOrder) {
        const [x, y] = pointAt(car.p)
        const highlighted = isHighlighted(car.d)
        const r = highlighted ? 6 : 5
        ctx.globalAlpha = car.state === 'pit' ? 0.45 : 1
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = colorOf(car.d)
        ctx.fill()
        ctx.lineWidth = highlighted ? 1.75 : 1.5
        ctx.strokeStyle = highlighted ? colors.car : colors.surface
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      // Labels sit off the track, on the outside of the circuit, so they never cover a car.
      // Pills mark the leader (P1), the two Lap Duel drivers and the followed car, all in the
      // same style: the car's team colour for both the leader line and the pill, so each pill
      // matches its dot. They step further out if they'd hit another label. Every other car
      // gets a plain code just past the track edge, faded out where it would collide.
      const PILL_H = 16
      const TEXT_H = 12
      const CALLOUT = 28
      const EDGE = 11 // just past the track's half-width
      const placed: Rect[] = []
      const canvasW = w
      const canvasH = h
      // Obstacles: every car dot, placed labels and leader lines.
      const dots: Rect[] = cars.map((c) => {
        const [cx, cy] = pointAt(c.p)
        return { x: cx - 7, y: cy - 7, w: 14, h: 14 }
      })
      const fits = (r: Rect, ignoreDotAt?: [number, number]) =>
        placed.every((q) => !overlaps(r, q)) &&
        dots.every(
          (d) =>
            (ignoreDotAt &&
              Math.abs(d.x + 7 - ignoreDotAt[0]) < 0.5 &&
              Math.abs(d.y + 7 - ignoreDotAt[1]) < 0.5) ||
            !overlaps(r, d),
        )
      const reserveLine = (x1: number, y1: number, x2: number, y2: number) => {
        // A leader line is thin; reserve a few boxes along it rather than its whole bbox.
        for (let t = 0.25; t <= 1; t += 0.25) {
          const px = x1 + (x2 - x1) * t
          const py = y1 + (y2 - y1) * t
          placed.push({ x: px - 2, y: py - 2, w: 4, h: 4 })
        }
      }
      const keepOnCanvas = (r: Rect): Rect => ({
        ...r,
        x: clamp(r.x, 2, canvasW - r.w - 2),
        y: clamp(r.y, 2, canvasH - r.h - 2),
      })
      // A rect of width `rw` whose inner end sits at (ax, ay), extending away from the track.
      const rectAt = (ax: number, ay: number, nx: number, rw: number, rh: number): Rect =>
        keepOnCanvas({ x: nx >= 0 ? ax : ax - rw, y: ay - rh / 2, w: rw, h: rh })
      const isLeader = (d: string) => d === leader
      const pills = drawOrder.filter((c) => isHighlighted(c.d) || isLeader(c.d)).reverse()
      const plain = drawOrder.filter((c) => !isHighlighted(c.d) && !isLeader(c.d)).reverse()

      for (const car of pills) {
        const [x, y] = pointAt(car.p)
        const [nx, ny] = outwardAt(car.p)
        const highlighted = isHighlighted(car.d)
        const text = isLeader(car.d) ? `P1 ${car.d}` : car.d
        const rw = ctx.measureText(text).width + 12
        // Try the outside at growing distances, then the inside if the outside is crowded
        // or runs off the canvas; keep the first clear spot (or the first try).
        const tries: [number, number, number][] = []
        for (const dir of [1, -1]) {
          for (let step = 0; step <= 4; step++)
            tries.push([nx * dir, ny * dir, CALLOUT + step * 18])
        }
        const candidates = tries.map(([dx, dy, d]) => ({
          rect: rectAt(x + dx * d, y + dy * d, dx, rw, PILL_H),
          dx,
          dy,
        }))
        // Stick with last frame's spot while it's still clear.
        const prev = pillMemo.get(car.d)
        const sticky = prev && candidates[prev.idx] && fits(candidates[prev.idx]!.rect)
        let idx = sticky ? prev.idx : candidates.findIndex((c) => fits(c.rect))
        if (idx < 0) idx = prev?.idx ?? 0
        const target = candidates[idx]!.rect
        placed.push(target) // others avoid where this pill is heading
        // Glide the pill (as an offset from its dot) toward the target spot.
        const tx0 = target.x - x
        const ty0 = target.y - y
        const ox = prev ? prev.ox + (tx0 - prev.ox) * EASE : tx0
        const oy = prev ? prev.oy + (ty0 - prev.oy) * EASE : ty0
        if (Math.abs(tx0 - ox) > 0.5 || Math.abs(ty0 - oy) > 0.5) settling = true
        pillMemo.set(car.d, { idx, ox, oy })
        const rect = { ...target, x: x + ox, y: y + oy }

        ctx.globalAlpha = car.state === 'pit' ? 0.55 : 1
        const fill = colorOf(car.d)
        // Leader line: from the dot's edge to the pill's nearest end.
        const right = rect.x + rect.w / 2 >= x
        const ex = right ? rect.x : rect.x + rect.w
        const ey = rect.y + rect.h / 2
        const len = Math.hypot(ex - x, ey - y) || 1
        const [ux, uy] = [(ex - x) / len, (ey - y) / len]
        reserveLine(x + ux * 9, y + uy * 9, ex, ey)
        ctx.beginPath()
        ctx.moveTo(x + ux * 7, y + uy * 7)
        ctx.lineTo(ex, ey)
        ctx.strokeStyle = fill
        ctx.lineWidth = highlighted ? 1.5 : 1.25
        ctx.stroke()
        ctx.beginPath()
        ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 4)
        ctx.fillStyle = fill
        ctx.fill()
        ctx.fillStyle = readableOn(fill)
        ctx.fillText(text, rect.x + 6, rect.y + rect.h / 2 + 0.5)
        ctx.globalAlpha = 1
      }
      for (const d of pillMemo.keys()) {
        if (!pills.some((c) => c.d === d)) pillMemo.delete(d)
      }

      for (const car of plain) {
        const [x, y] = pointAt(car.p)
        const [nx, ny] = outwardAt(car.p)
        const rw = ctx.measureText(car.d).width
        const rect = rectAt(x + nx * EDGE, y + ny * EDGE, nx, rw, TEXT_H)
        const show = fits(rect, [x, y])
        if (show) placed.push(rect)
        const was = labelAlpha.get(car.d) ?? (show ? 1 : 0)
        const alpha = was + ((show ? 1 : 0) - was) * EASE
        if (Math.abs((show ? 1 : 0) - alpha) > 0.02) settling = true
        labelAlpha.set(car.d, alpha)
        if (alpha < 0.03) continue
        ctx.globalAlpha = alpha * (car.state === 'pit' ? 0.55 : 1)
        ctx.fillStyle = colors.label
        ctx.fillText(car.d, rect.x, rect.y + rect.h / 2 + 0.5)
        ctx.globalAlpha = 1
      }
      // Keep drawing while callouts are still gliding, even when the clock is paused.
      if (settling) schedule()
    }

    resize()
    draw()
    const stop = usePlayback.subscribe(schedule)
    const observer = new ResizeObserver(() => {
      resize()
      draw()
    })
    observer.observe(box)
    return () => {
      stop()
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [meta, replay, resolvedTheme, duel, colorOf])

  return (
    <div ref={host} className="relative aspect-[16/10] max-h-[560px] w-full">
      <canvas
        ref={canvas}
        role="img"
        aria-label={`${meta.circuit.name} with every car's position at the current replay time`}
        className="absolute inset-0"
      />
    </div>
  )
}
