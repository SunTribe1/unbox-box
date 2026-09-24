'use client'

import { miniSectors, sectionForCorner } from '@unbox-box/tools'
import { m } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import { DataQualityNote } from '@/components/data-quality-note'
import { SaveImageButton } from '@/components/save-image-button'
import { HelpText } from '@/components/help-text'
import { rotator, smoothSvgPath, startLine } from '@/lib/track-path'
import { ReplayIcon } from '@/components/icons'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EASE_OUT } from '@/lib/motion'
import { useApp, useHover } from '@/lib/store'
import type { DuelData } from './use-duel'

/** FastF1's rotation convention, then flip y for screen space. */
const path = smoothSvgPath

export function TrackMap({ data }: { data: DuelData }) {
  const { meta, telA, telB, lapA, lapB } = data
  const corner = useApp((s) => s.corner)
  const setCorner = useApp((s) => s.setCorner)
  const dotRef = useRef<SVGCircleElement>(null)

  const geo = useMemo(() => {
    const rotate = rotator(meta.circuit.rotation)
    const outline = meta.track.x.map((x, i) => rotate(x, meta.track.y[i] ?? 0))
    const xs = outline.map((p) => p[0])
    const ys = outline.map((p) => p[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const size = Math.max(maxX - minX, maxY - minY)
    const pad = size * 0.07
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const outlineStep = meta.telemetry.length / outline.length
    const slice = (from: number, to: number) =>
      outline.slice(
        Math.max(0, Math.floor(from / outlineStep)),
        Math.min(outline.length, Math.ceil(to / outlineStep) + 1),
      )
    const corners = meta.circuit.corners.map((c) => {
      const [x, y] = rotate(c.x, c.y)
      const dx = x - cx
      const dy = y - cy
      const len = Math.hypot(dx, dy) || 1
      const offset = size * 0.05
      return { ...c, x: x + (dx / len) * offset, y: y + (dy / len) * offset, tx: x, ty: y }
    })
    return {
      rotate,
      outline,
      slice,
      corners,
      viewBox: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`,
      stroke: size * 0.012,
      label: size * 0.026,
    }
  }, [meta])

  const sectors = useMemo(
    () => miniSectors(telA, telB, meta, { a: lapA.time, b: lapB.time }),
    [telA, telB, meta, lapA.time, lapB.time],
  )
  const section = corner != null ? sectionForCorner(meta, corner) : undefined
  const wins = {
    a: sectors.filter((s) => s.winner === 'a').length,
    b: sectors.filter((s) => s.winner === 'b').length,
  }

  // Hover dot follows the shared cursor without re-rendering React.
  useEffect(
    () =>
      useHover.subscribe(({ index }) => {
        const dot = dotRef.current
        if (!dot) return
        if (index == null) {
          dot.style.opacity = '0'
          return
        }
        const [x, y] = geo.rotate(telA.x[index] ?? 0, telA.y[index] ?? 0)
        dot.setAttribute('cx', String(x))
        dot.setAttribute('cy', String(y))
        dot.style.opacity = '1'
      }),
    [geo, telA],
  )

  const start = startLine(geo.outline, geo.stroke * 2)

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="grid gap-0.5">
          <CardTitle>
            <ReplayIcon />
            Mini-sectors
          </CardTitle>
          <CardDescription>who was faster, stretch by stretch</CardDescription>
        </div>
        <CardAction>
          <SaveImageButton name="Track mini-sectors" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-3 grid grid-cols-2 gap-2" aria-label="Mini-sectors won">
          {(['a', 'b'] as const).map((side) => (
            <div key={side} className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-3 py-2">
              <span
                className={
                  side === 'a'
                    ? 'h-1.5 w-6 rounded-full bg-driver-a'
                    : 'h-1.5 w-6 rounded-full bg-driver-b'
                }
                aria-hidden
              />
              <span className="font-mono text-sm font-semibold">
                {side === 'a' ? telA.driver : telB.driver}
              </span>
              <span className="ml-auto numeric text-sm">
                {side === 'a' ? wins.a : wins.b}
                <span className="ml-1 text-caption text-muted-foreground">won</span>
              </span>
            </div>
          ))}
        </div>
        <svg
          viewBox={geo.viewBox}
          className="aspect-[4/3] w-full"
          // A group, not an image: the corner numbers inside are buttons.
          role="group"
          aria-label={`${meta.circuit.name} map. Mini-sectors colored by the faster driver: ${telA.driver} ${wins.a}, ${telB.driver} ${wins.b}.`}
        >
          {/* Keyed by session: a new circuit draws itself in once. */}
          <m.path
            key={meta.id}
            d={path(geo.outline)}
            fill="none"
            stroke="var(--surface-3)"
            strokeWidth={geo.stroke * 2.4}
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
          />
          {section && (
            <m.path
              key={section.id}
              d={path(geo.slice(section.focus.from, section.focus.to))}
              fill="none"
              stroke="var(--signal)"
              strokeWidth={geo.stroke * 3.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'blur(6px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0.35, 0.9, 0.55] }}
              transition={{ duration: 1.6, ease: 'easeInOut' }}
            />
          )}
          <m.g
            key={`sectors-${meta.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.55, ease: EASE_OUT }}
          >
            {sectors.map((s) => (
              <path
                key={s.index}
                d={path(geo.slice(s.from, s.to))}
                fill="none"
                stroke={
                  s.winner === 'a'
                    ? 'var(--driver-a)'
                    : s.winner === 'b'
                      ? 'var(--driver-b)'
                      : 'var(--even)'
                }
                strokeWidth={geo.stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transition: 'stroke 280ms ease-out' }}
              >
                <title>
                  Mini-sector {s.index + 1}:{' '}
                  {s.winner === 'even'
                    ? 'even'
                    : `${s.winner === 'a' ? telA.driver : telB.driver} faster by ${Math.abs(s.delta).toFixed(3)}s`}
                </title>
              </path>
            ))}
          </m.g>
          {start && (
            <line
              x1={start[0][0]}
              y1={start[0][1]}
              x2={start[1][0]}
              y2={start[1][1]}
              stroke="var(--foreground)"
              strokeWidth={geo.stroke * 0.8}
              strokeLinecap="round"
            >
              <title>Start / finish</title>
            </line>
          )}
          {geo.corners.map((c) => {
            const active = section?.corners.includes(c.number)
            return (
              <g
                key={c.number}
                role="button"
                tabIndex={0}
                aria-label={`Turn ${c.number}${c.name ? `, ${c.name}` : ''}`}
                className="cursor-pointer outline-none"
                onClick={() => setCorner(active ? null : c.number)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setCorner(active ? null : c.number)
                }}
              >
                <line
                  x1={c.tx}
                  y1={c.ty}
                  x2={c.x}
                  y2={c.y}
                  stroke="var(--faint-foreground)"
                  strokeWidth={geo.stroke * 0.25}
                  opacity={0.5}
                />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={geo.label}
                  fill={active ? 'var(--signal)' : 'var(--surface-2)'}
                  stroke={active ? 'var(--signal)' : 'var(--border)'}
                  strokeWidth={geo.stroke * 0.3}
                />
                <text
                  x={c.x}
                  y={c.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={geo.label * 1.05}
                  fontFamily="var(--font-mono)"
                  fill={active ? 'var(--signal-foreground)' : 'var(--muted-foreground)'}
                >
                  {c.number}
                </text>
              </g>
            )
          })}
          <circle
            ref={dotRef}
            r={geo.stroke * 1.6}
            fill="var(--driver-a)"
            stroke="var(--surface-1)"
            strokeWidth={geo.stroke * 0.6}
            style={{ opacity: 0, transition: 'opacity 150ms' }}
            pointerEvents="none"
          />
        </svg>
        <DataQualityNote meta={meta} className="mt-2" />
        <HelpText className="mt-2">
          {section ? (
            <>
              <span className="font-medium text-signal-ink">{section.name}</span> ({section.turns})
              · tap again to clear
            </>
          ) : (
            'Tap a corner number to highlight it on every chart.'
          )}
        </HelpText>
      </CardContent>
    </Card>
  )
}
