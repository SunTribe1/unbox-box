'use client'

import { fitModel, type Replay, type SessionMeta, type StrategyModel } from '@unbox-box/tools'
import { useMemo } from 'react'
import { compoundName } from '@/lib/tyres'
import type { RaceData } from '@/lib/types'
import { CompoundTyre } from '@/components/icons/compound-tyre'
import { Field, FieldLabel } from '@/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Slider } from '@/components/ui/slider'

/** Props for strategy cards: the race plus the tyre model fitted on it. */
export interface StrategyCardProps extends RaceData {
  model: StrategyModel
}

export function useStrategyModel(meta: SessionMeta, replay: Replay) {
  return useMemo(() => fitModel(meta, replay), [meta, replay])
}

export function CompoundPicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange(value: string): void
  label: string
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v)}
      aria-label={label}
    >
      {(['SOFT', 'MEDIUM', 'HARD'] as const).map((c) => (
        <ToggleGroupItem key={c} value={c}>
          <CompoundTyre compound={c} className="size-3.5" />
          {compoundName(c)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function LapSlider({
  id,
  value,
  min,
  max,
  onChange,
  label,
}: {
  id: string
  value: number
  min: number
  max: number
  onChange(value: number): void
  label: string
}) {
  return (
    <Field className="gap-1.5">
      <FieldLabel
        htmlFor={id}
        className="flex items-baseline justify-between text-caption font-normal text-muted-foreground"
      >
        {label}
        <span className="numeric text-sm text-foreground">Lap {value}</span>
      </FieldLabel>
      <Slider
        id={id}
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([v]) => v != null && onChange(v)}
        aria-label={label}
        className="py-1.5 [&_[data-slot=slider-range]]:bg-signal [&_[data-slot=slider-thumb]]:border-signal"
      />
      <div className="flex justify-between font-mono text-[10px] text-faint-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </Field>
  )
}
