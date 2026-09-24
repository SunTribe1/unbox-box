'use client'

import {
  type DuelSide,
  findResult,
  formatLapTime,
  type SessionMeta,
  type Trace,
  TRACES,
} from '@unbox-box/tools'
import {
  ActivityIcon,
  ArrowLeftRightIcon,
  ChevronsDownIcon,
  ChevronsUpIcon,
  CogIcon,
  GaugeIcon,
} from 'lucide-react'
import type * as React from 'react'
import { StopwatchIcon } from '@/components/icons'
import { DuelDot } from '@/components/driver-marks'
import { ButtonGroup } from '@/components/ui/button-group'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApp } from '@/lib/store'

const TRACE_ICONS: Record<Trace, React.ElementType> = {
  delta: StopwatchIcon,
  speed: GaugeIcon,
  throttle: ChevronsUpIcon,
  brake: ChevronsDownIcon,
  gear: CogIcon,
  rpm: ActivityIcon,
}

const TRACE_LABELS: Record<Trace, string> = {
  delta: 'Gap',
  speed: 'Speed',
  throttle: 'Throttle',
  brake: 'Brake',
  gear: 'Gear',
  rpm: 'RPM',
}

function DriverPicker({ meta, side }: { meta: SessionMeta; side: DuelSide }) {
  const duel = useApp((s) => s.duel)
  const setDuel = useApp((s) => s.setDuel)
  if (!duel) return null
  const code = side === 'a' ? duel.a : duel.b
  const lap = side === 'a' ? duel.lapA : duel.lapB
  const laps = (meta.laps[code] ?? []).filter((l) => l.telemetry)

  const pickDriver = (next: string) => {
    const best = findResult(meta, next)?.lap
    if (!best) return
    setDuel(side === 'a' ? { ...duel, a: next, lapA: best } : { ...duel, b: next, lapB: best })
  }
  const pickLap = (value: string) => {
    const n = Number(value)
    setDuel(side === 'a' ? { ...duel, lapA: n } : { ...duel, lapB: n })
  }

  return (
    <ButtonGroup aria-label={`Driver ${side.toUpperCase()} and lap`}>
      <Select value={code} onValueChange={pickDriver}>
        <SelectTrigger aria-label={`Driver ${side.toUpperCase()}`} className="w-[104px] font-mono">
          <DuelDot side={side} />
          <SelectValue>{code}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Classification</SelectLabel>
            {meta.results.map((r) => (
              <SelectItem key={r.driver} value={r.driver} disabled={!r.lap}>
                <span className="w-7 numeric text-xs text-faint-foreground">P{r.position}</span>
                <span className="font-mono">{r.driver}</span>
                <span className="ml-auto pl-4 numeric text-xs text-muted-foreground">
                  {formatLapTime(r.time)}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Select value={String(lap)} onValueChange={pickLap}>
        <SelectTrigger
          aria-label={`Lap for driver ${side.toUpperCase()}`}
          className="w-[108px] font-mono"
        >
          <SelectValue>
            L{lap}
            <span className="ml-1 text-xs text-faint-foreground">
              {laps.find((l) => l.lap === lap)?.segment}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Laps with telemetry</SelectLabel>
            {laps.map((l) => (
              <SelectItem key={l.lap} value={String(l.lap)}>
                <span className="font-mono">L{l.lap}</span>
                <span className="font-mono text-xs text-faint-foreground">{l.segment}</span>
                <span className="ml-auto pl-3 numeric text-xs text-muted-foreground">
                  {formatLapTime(l.time)}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </ButtonGroup>
  )
}

export function DuelControls({ meta }: { meta: SessionMeta }) {
  const swap = useApp((s) => s.swapDuel)
  const traces = useApp((s) => s.traces)
  const setTraces = useApp((s) => s.setTraces)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <DriverPicker meta={meta} side="a" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={swap} aria-label="Swap drivers">
              <ArrowLeftRightIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Swap A and B</TooltipContent>
        </Tooltip>
        <DriverPicker meta={meta} side="b" />
      </div>
      <ToggleGroup
        type="multiple"
        value={traces}
        onValueChange={(value: string[]) => {
          if (!value.length) return
          // Keep the order the user dragged the charts into; new traces join at the bottom.
          const next = value as Trace[]
          setTraces([
            ...traces.filter((t) => next.includes(t)),
            ...next.filter((t) => !traces.includes(t)),
          ])
        }}
        aria-label="Telemetry traces"
      >
        {TRACES.map((t) => {
          const Icon = TRACE_ICONS[t]
          return (
            <ToggleGroupItem key={t} value={t} aria-label={TRACE_LABELS[t]}>
              <Icon strokeWidth={1.5} />
              <span className="max-sm:sr-only">{TRACE_LABELS[t]}</span>
            </ToggleGroupItem>
          )
        })}
      </ToggleGroup>
    </div>
  )
}
