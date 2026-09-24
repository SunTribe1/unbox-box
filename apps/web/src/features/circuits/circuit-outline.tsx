'use client'

import type { CircuitShapes } from '@unbox-box/tools'
import { m } from 'motion/react'
import { useMemo } from 'react'
import { rotator, smoothSvgPath, startLine } from '@/lib/track-path'
import { cn } from '@/lib/utils'

/** A circuit drawn from its outline: smooth line, start/finish, optional corner numbers.
 *  `layoutId` lets a card's outline glide into the page hero when a circuit opens. */
export function CircuitOutline({
  shape,
  corners = false,
  layoutId,
  className,
  label,
}: {
  shape: CircuitShapes[string]
  corners?: boolean
  layoutId?: string
  className?: string
  label: string
}) {
  const geo = useMemo(() => {
    const rotate = rotator(shape.rotation)
    const pts = shape.x.map((x, i) => rotate(x, shape.y[i] ?? 0))
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const size = Math.max(maxX - minX, maxY - minY) || 1
    const pad = size * (corners ? 0.12 : 0.06)
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const stroke = size * 0.018
    const marks = shape.corners.map((c) => {
      const [x, y] = rotate(c.x, c.y)
      const dx = x - cx
      const dy = y - cy
      const len = Math.hypot(dx, dy) || 1
      return { ...c, x: x + (dx / len) * size * 0.06, y: y + (dy / len) * size * 0.06 }
    })
    return {
      viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`,
      d: smoothSvgPath([...pts, pts[0]!]),
      start: startLine(pts, stroke * 2.2),
      stroke,
      size,
      marks,
    }
  }, [shape, corners])

  return (
    <m.div layoutId={layoutId} className={cn('text-foreground', className)}>
      <svg viewBox={geo.viewBox} className="size-full" role="img" aria-label={label}>
        <path
          d={geo.d}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={geo.stroke * 2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={geo.d}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.85}
          strokeWidth={geo.stroke * 0.7}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {geo.start && (
          <line
            x1={geo.start[0][0]}
            y1={geo.start[0][1]}
            x2={geo.start[1][0]}
            y2={geo.start[1][1]}
            stroke="var(--signal)"
            strokeWidth={geo.stroke * 0.9}
            strokeLinecap="round"
          />
        )}
        {corners &&
          geo.marks.map((c) => (
            <g key={c.number}>
              <circle cx={c.x} cy={c.y} r={geo.size * 0.022} fill="var(--surface-2)" />
              <text
                x={c.x}
                y={c.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={geo.size * 0.024}
                fill="var(--muted-foreground)"
                fontFamily="var(--font-mono)"
              >
                {c.number}
              </text>
              {c.name && <title>{`T${c.number} ${c.name}`}</title>}
            </g>
          ))}
      </svg>
    </m.div>
  )
}
