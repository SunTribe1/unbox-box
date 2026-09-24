'use client'

import type * as React from 'react'
import { deltaSeries, formatGap, sectionForCorner, type Trace } from '@unbox-box/tools'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVerticalIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type uPlot from 'uplot'
import { HelmetIcon, ReplayIcon } from '@/components/icons'
import { SaveImageButton } from '@/components/save-image-button'
import { HelpText } from '@/components/help-text'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApp, useHover } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useDuelColors } from '@/lib/use-team-colors'
import { UPlotChart, type ChartSeries } from './uplot-chart'
import type { DuelData } from './use-duel'

interface TraceSpec {
  title: string
  unit: string
  height: number
  series(d: DuelData): { values: (number | null)[][]; series: ChartSeries[] }
  yRange?: [number, number]
  yTicks?: (min: number, max: number) => number[]
  formatY?: (v: number) => string
  zeroLine?: boolean
}

const pair = (d: DuelData, key: 'speed' | 'throttle' | 'gear' | 'rpm', step = false) => ({
  values: [d.telA[key], d.telB[key]],
  series: [
    { label: d.telA.driver, color: '--driver-a', width: 1.75, step },
    { label: `${d.telB.driver} `, color: '--driver-b', width: 1.75, step },
  ],
})

const TRACE_SPECS: Record<Trace, TraceSpec> = {
  delta: {
    title: 'Gap',
    unit: 's',
    height: 120,
    zeroLine: true,
    formatY: (v) => (v === 0 ? '0' : `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`),
    series: (d) => ({
      values: [deltaSeries(d.telA, d.telB)],
      series: [{ label: 'gap', color: '--foreground', width: 1.75 }],
    }),
  },
  speed: {
    title: 'Speed',
    unit: 'km/h',
    height: 200,
    yTicks: (min, max) => [100, 150, 200, 250, 300, 350].filter((v) => v >= min && v <= max),
    series: (d) => pair(d, 'speed'),
  },
  throttle: {
    title: 'Throttle',
    unit: '%',
    height: 92,
    yRange: [-4, 104],
    yTicks: () => [0, 50, 100],
    series: (d) => pair(d, 'throttle'),
  },
  brake: {
    title: 'Brake',
    unit: '',
    height: 60,
    yRange: [0, 1.4],
    yTicks: () => [],
    series: (d) => ({
      // Two lanes: A on top, B below, drawn only while braking.
      values: [
        d.telA.brake.map((v) => (v > 0 ? 1.05 : null)),
        d.telB.brake.map((v) => (v > 0 ? 0.45 : null)),
      ],
      series: [
        { label: d.telA.driver, color: '--driver-a', width: 7 },
        { label: `${d.telB.driver} `, color: '--driver-b', width: 7 },
      ],
    }),
  },
  gear: {
    title: 'Gear',
    unit: '',
    height: 92,
    yRange: [0.5, 8.5],
    yTicks: () => [2, 4, 6, 8],
    series: (d) => pair(d, 'gear', true),
  },
  rpm: {
    title: 'RPM',
    unit: '×1000',
    height: 92,
    formatY: (v) => (v / 1000).toFixed(0),
    series: (d) => pair(d, 'rpm'),
  },
}

function Readout({ data }: { data: DuelData }) {
  const index = useHover((s) => s.index)
  const { telA, telB, meta } = data
  const i = index ?? null
  const step = meta.telemetry.step
  const row = (label: string, a: string, b: string) => (
    <div className="flex items-baseline gap-2">
      <span className="font-sans text-faint-foreground">{label}</span>
      <span className="size-1.5 self-center rounded-full bg-driver-a" aria-hidden />
      <span>{a}</span>
      <span className="size-1.5 self-center rounded-full bg-driver-b" aria-hidden />
      <span>{b}</span>
    </div>
  )
  if (i == null) {
    return (
      <HelpText>
        Hover or drag across the charts to read any point · tap a corner to zoom in · drag a
        chart&apos;s handle to reorder
      </HelpText>
    )
  }
  const gap = (telB.t[i] ?? 0) - (telA.t[i] ?? 0)
  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 numeric text-xs">
      <span className="text-foreground">{((i * step) / 1000).toFixed(2)} km</span>
      {row('spd', `${telA.speed[i]}`, `${telB.speed[i]}`)}
      {row('thr', `${telA.throttle[i]}%`, `${telB.throttle[i]}%`)}
      {row('gear', `${telA.gear[i]}`, `${telB.gear[i]}`)}
      <span>
        <span className="font-sans text-faint-foreground">gap </span>
        {telB.driver} {formatGap(gap)}s
      </span>
    </div>
  )
}

/** One chart row that can be dragged (or moved with the keyboard) to reorder the stack. */
function SortableChart({
  trace,
  title,
  children,
}: {
  trace: Trace
  title: string
  children: (handle: React.ReactNode) => React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: trace })
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Reorder the ${title} chart`}
      data-export-hide=""
      className="-ml-1.5 flex size-5 cursor-grab touch-none items-center justify-center rounded text-faint-foreground opacity-60 transition-opacity group-hover/chart:opacity-100 hover:text-foreground focus-visible:opacity-100 active:cursor-grabbing"
    >
      <GripVerticalIcon className="size-3.5" />
    </button>
  )
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'group/chart relative bg-card',
        isDragging && 'z-10 rounded-lg shadow-lg ring-1 ring-border',
      )}
    >
      {children(handle)}
    </div>
  )
}

const MAX_GROW = 1.5

/** Grows the charts to fill their card when the column beside them is taller, so the card
 *  never ends in blank space. `plotHeight` is the charts' natural total height. The card's
 *  height comes from the other column, so filling it can't feed back into a loop. */
function useFillScale(plotHeight: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [value, setValue] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // scrollHeight never drops below the box itself, so add up the charts instead.
        const style = getComputedStyle(el)
        const used =
          [...el.children].reduce((sum, child) => sum + (child as HTMLElement).offsetHeight, 0) +
          Number.parseFloat(style.paddingTop) +
          Number.parseFloat(style.paddingBottom)
        const spare = el.clientHeight - used
        setValue((current) => {
          // Spare space at the current scale, turned back into natural chart pixels.
          const next = Math.min(MAX_GROW, Math.max(1, current + spare / plotHeight))
          return Math.abs(next - current) > 0.02 ? next : current
        })
      })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [plotHeight])
  return [ref, value] as const
}

export function TelemetryCharts({ data }: { data: DuelData }) {
  const traces = useApp((s) => s.traces)
  const setTraces = useApp((s) => s.setTraces)
  const corner = useApp((s) => s.corner)
  const dndId = useId()
  const sensors = useSensors(
    // A short drag threshold keeps taps and chart scrubbing from starting a reorder.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const name = (id: UniqueIdentifier) => TRACE_SPECS[id as Trace]?.title ?? String(id)
  const place = (id: UniqueIdentifier | undefined) =>
    id == null ? '' : `, position ${traces.indexOf(id as Trace) + 1} of ${traces.length}`
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up the ${name(active.id)} chart${place(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${name(active.id)} chart moved over ${name(over.id)}${place(over.id)}.` : '',
    onDragEnd: ({ active, over }) =>
      over
        ? `${name(active.id)} chart dropped${place(over.id)}.`
        : `${name(active.id)} chart dropped.`,
    onDragCancel: ({ active }) => `Reorder cancelled. ${name(active.id)} chart is back in place.`,
  }
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = traces.indexOf(active.id as Trace)
    const to = traces.indexOf(over.id as Trace)
    if (from >= 0 && to >= 0) setTraces(arrayMove(traces, from, to))
  }
  const { resolvedTheme } = useTheme()
  const colors = useDuelColors()
  const { meta } = data
  const x = useMemo(
    () => data.telA.t.map((_, i) => i * meta.telemetry.step),
    [data.telA, meta.telemetry.step],
  )
  const markers = useMemo(
    () => meta.circuit.corners.map((c) => ({ at: c.distance, label: `${c.number}` })),
    [meta],
  )
  const band = useMemo(() => {
    if (corner == null) return null
    const section = sectionForCorner(meta, corner)
    return section ? section.focus : null
  }, [corner, meta])

  const [chartsRef, fill] = useFillScale(traces.reduce((sum, t) => sum + TRACE_SPECS[t].height, 0))
  const charts = useMemo(
    () =>
      traces.map((trace) => {
        const spec = TRACE_SPECS[trace]
        const built = spec.series(data)
        // Teammates share a color family: B is tinted and dashed so the lines never merge.
        const series = colors?.shared
          ? built.series.map((x) =>
              x.color === '--driver-b' && (x.width ?? 0) < 4 ? { ...x, dash: [6, 4] } : x,
            )
          : built.series
        return {
          trace,
          spec,
          series,
          aligned: [x, ...built.values] as uPlot.AlignedData,
        }
      }),
    [traces, data, x, colors?.shared],
  )

  return (
    <Card className="h-full overflow-hidden">
      <div className="flex min-h-10 items-center justify-between gap-3 border-b px-4 py-2">
        <Readout data={data} />
        <div className="hidden shrink-0 items-center gap-4 text-xs text-muted-foreground sm:flex">
          {(['a', 'b'] as const).map((side) => {
            const tel = side === 'a' ? data.telA : data.telB
            return (
              <span key={side} className="flex items-center gap-2">
                <span
                  className={cn('h-0.5 w-4 rounded', side === 'a' ? 'bg-driver-a' : 'bg-driver-b')}
                  aria-hidden
                />
                <span className="flex items-center gap-1 font-mono text-foreground">
                  <HelmetIcon
                    className={cn('size-3.5', side === 'a' ? 'text-driver-a' : 'text-driver-b')}
                    aria-hidden
                  />
                  {tel.driver}
                </span>
                <span className="flex items-center gap-1 numeric">
                  <ReplayIcon className="size-3.5" aria-hidden />
                  <span className="sr-only">Lap </span>L{tel.lap}
                </span>
              </span>
            )
          })}
        </div>
        <SaveImageButton name={`${data.telA.driver} vs ${data.telB.driver} telemetry`} />
      </div>
      {/* Keyed by the lap pair: a new comparison wipes in left to right. */}
      <div
        key={`${data.telA.driver}${data.telA.lap}-${data.telB.driver}${data.telB.lap}`}
        ref={chartsRef}
        className="flex min-h-0 flex-1 animate-chart-reveal flex-col py-1"
      >
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
          accessibility={{ announcements }}
        >
          <SortableContext items={traces} strategy={verticalListSortingStrategy}>
            {charts.map(({ trace, spec, series, aligned }, i) => (
              <SortableChart key={trace} trace={trace} title={spec.title}>
                {(handle) => (
                  <>
                    <div className="flex items-center gap-1.5 px-4 pt-2 text-[11px] font-medium text-muted-foreground">
                      {handle}
                      {spec.title}
                      {spec.unit && <span className="text-faint-foreground">{spec.unit}</span>}
                      {trace === 'delta' && (
                        <Tooltip>
                          <TooltipTrigger className="text-faint-foreground underline decoration-dotted underline-offset-2">
                            above 0 = {data.telB.driver} behind
                          </TooltipTrigger>
                          <TooltipContent className="max-w-64">
                            Time gap at each point, from speed traces aligned at every braking zone
                            and pinned to official sector times. It can swing briefly under braking;
                            section totals are exact.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <UPlotChart
                      data={aligned}
                      series={series}
                      height={Math.round(spec.height * fill) + (i === charts.length - 1 ? 28 : 0)}
                      yRange={spec.yRange}
                      yTicks={spec.yTicks}
                      formatY={spec.formatY}
                      zeroLine={spec.zeroLine}
                      showX={i === charts.length - 1}
                      markers={markers}
                      showMarkerLabels={i === 0}
                      band={band}
                      themeKey={`${resolvedTheme ?? 'dark'}|${colors?.a}|${colors?.b}|${colors?.shared}`}
                      ariaLabel={`${spec.title} trace for ${data.telA.driver} and ${data.telB.driver}`}
                    />
                  </>
                )}
              </SortableChart>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </Card>
  )
}
