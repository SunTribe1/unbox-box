'use client'

import { useEffect, useRef } from 'react'
import uPlot from 'uplot'
import { useHover } from '@/lib/store'
import { cssVar } from '@/lib/utils'

export interface ChartSeries {
  label: string
  color: string // CSS variable name, e.g. --driver-a
  width?: number
  dash?: number[]
  step?: boolean
  fill?: string // CSS variable name
}

export interface Band {
  from: number
  to: number
}

interface Props {
  data: uPlot.AlignedData
  series: ChartSeries[]
  height: number
  yRange?: [number, number]
  yTicks?: (min: number, max: number) => number[]
  formatY?: (v: number) => string
  showX?: boolean
  zeroLine?: boolean
  markers: { at: number; label: string }[]
  showMarkerLabels?: boolean
  band: Band | null
  themeKey: string
  ariaLabel: string
}

const SYNC_KEY = 'lap-duel'

/** Thin React wrapper around uPlot (canvas, handles 100k+ points). Cursor is synced across
 *  every chart in Lap Duel and published to the hover store for the track map. */
export function UPlotChart({
  data,
  series,
  height,
  yRange,
  yTicks,
  formatY = (v) => String(v),
  showX = false,
  zeroLine = false,
  markers,
  showMarkerLabels = false,
  band,
  themeKey,
  ariaLabel,
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const plot = useRef<uPlot | null>(null)
  const bandRef = useRef<Band | null>(band)
  const markersRef = useRef(markers)
  useEffect(() => {
    markersRef.current = markers
  }, [markers])

  useEffect(() => {
    const el = host.current
    if (!el) return
    const grid = cssVar('--grid')
    const ink = cssVar('--faint-foreground')
    const signalSoft = cssVar('--signal-soft')
    const signal = cssVar('--signal')
    const font = `10px ${cssVar('--font-mono') || 'monospace'}`

    const opts: uPlot.Options = {
      width: el.clientWidth || 600,
      height,
      padding: [showMarkerLabels ? 16 : 4, 8, 0, 0],
      cursor: {
        sync: { key: SYNC_KEY, setSeries: false },
        points: { size: 7, width: 2, stroke: () => cssVar('--surface-1') },
        drag: { x: false, y: false },
      },
      legend: { show: false },
      scales: {
        x: { time: false },
        y: yRange ? { range: yRange } : { auto: true },
      },
      axes: [
        {
          show: showX,
          stroke: ink,
          font,
          grid: { stroke: grid, width: 1 },
          ticks: { show: false },
          values: (_u, splits) => splits.map((v) => `${(v / 1000).toFixed(1)} km`),
          size: showX ? 28 : 0,
        },
        {
          stroke: ink,
          font,
          size: 46,
          grid: { stroke: grid, width: 1 },
          ticks: { show: false },
          ...(yTicks
            ? { splits: (_u: uPlot, _i: number, min: number, max: number) => yTicks(min, max) }
            : {}),
          values: (_u, splits) => splits.map(formatY),
        },
      ],
      series: [
        {},
        ...series.map((s) => ({
          label: s.label,
          stroke: cssVar(s.color),
          width: s.width ?? 1.5,
          dash: s.dash,
          fill: s.fill ? cssVar(s.fill) : undefined,
          points: { show: false },
          spanGaps: false,
          ...(s.step ? { paths: uPlot.paths.stepped!({ align: 1 }) } : {}),
        })),
      ],
      hooks: {
        drawClear: [
          (u) => {
            const ctx = u.ctx
            const { top, height: h } = u.bbox
            ctx.save()
            // Highlighted corner section.
            const b = bandRef.current
            if (b) {
              const x0 = u.valToPos(b.from, 'x', true)
              const x1 = u.valToPos(b.to, 'x', true)
              ctx.fillStyle = signalSoft
              ctx.fillRect(x0, top, x1 - x0, h)
            }
            // Corner hairlines.
            ctx.strokeStyle = grid
            ctx.lineWidth = 1
            for (const mk of markersRef.current) {
              const x = Math.round(u.valToPos(mk.at, 'x', true)) + 0.5
              ctx.beginPath()
              ctx.moveTo(x, top)
              ctx.lineTo(x, top + h)
              ctx.stroke()
            }
            ctx.restore()
          },
        ],
        draw: [
          (u) => {
            const ctx = u.ctx
            ctx.save()
            if (zeroLine) {
              const y = Math.round(u.valToPos(0, 'y', true)) + 0.5
              ctx.strokeStyle = ink
              ctx.globalAlpha = 0.6
              ctx.beginPath()
              ctx.moveTo(u.bbox.left, y)
              ctx.lineTo(u.bbox.left + u.bbox.width, y)
              ctx.stroke()
              ctx.globalAlpha = 1
            }
            if (showMarkerLabels) {
              const ratio = window.devicePixelRatio || 1
              ctx.font = `${10 * ratio}px ${cssVar('--font-mono') || 'monospace'}`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'top'
              const b = bandRef.current
              // Skip a label that would overlap the previous one (tight chicanes, narrow
              // screens); highlighted corners always get their label.
              const minGap = 14 * ratio
              let lastX = -Infinity
              for (const mk of markersRef.current) {
                const x = u.valToPos(mk.at, 'x', true)
                const inBand = b && mk.at >= b.from && mk.at <= b.to
                if (!inBand && x - lastX < minGap) continue
                lastX = x
                ctx.fillStyle = inBand ? signal : ink
                ctx.fillText(mk.label, x, u.bbox.top - 13 * ratio)
              }
            }
            ctx.restore()
          },
        ],
        setCursor: [(u) => useHover.getState().set(u.cursor.idx ?? null)],
      },
    }

    const instance = new uPlot(opts, data, el)
    plot.current = instance
    const observer = new ResizeObserver(() => {
      instance.setSize({ width: el.clientWidth, height })
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      instance.destroy()
      plot.current = null
    }
    // Rebuild only when the chart's structure or theme changes; data updates below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series.map((s) => s.label + s.color).join(), height, themeKey, showX, yRange?.join()])

  useEffect(() => {
    plot.current?.setData(data)
  }, [data])

  useEffect(() => {
    bandRef.current = band
    plot.current?.redraw(false)
  }, [band])

  return <div ref={host} role="img" aria-label={ariaLabel} className="w-full" />
}
