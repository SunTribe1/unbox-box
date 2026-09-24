'use client'

import { Hint } from '@/components/ui/hint'
import { GrowBar } from '@/components/ui/grow-bar'
import { cn } from '@/lib/utils'

export const pct = (v: number) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`

/** A labelled share, 0-1, as a thin bar with the figure at the end. */
export function RateRow({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-surface-2">
        <GrowBar value={value} className={cn('rounded-full bg-signal/80', className)} />
      </span>
      <span className="text-right numeric">{pct(value)}</span>
    </div>
  )
}

export interface SeasonBar {
  year: number
  value: number
  /** Marks a title-winning season. */
  champion?: boolean
  label: string
  color?: string
}

/** One column per season (gaps for seasons missed), champion seasons starred. */
export function SeasonBars({ bars, unit }: { bars: SeasonBar[]; unit: string }) {
  if (!bars.length) return null
  const first = bars[0]!.year
  const last = bars.at(-1)!.year
  const byYear = new Map(bars.map((b) => [b.year, b]))
  const years = Array.from({ length: last - first + 1 }, (_, i) => first + i)
  const max = Math.max(...bars.map((b) => b.value), 1)
  return (
    <div className="grid gap-1.5">
      <div className="overflow-x-auto">
        <div
          className="flex h-32 items-end gap-[3px]"
          style={{ minWidth: years.length > 30 ? `${years.length * 14}px` : undefined }}
        >
          {years.map((y) => {
            const b = byYear.get(y)
            return (
              <Hint key={y} label={b ? `${y}: ${b.label}` : `${y}: did not race`}>
                <div className="flex h-full min-w-2 flex-1 flex-col items-center justify-end gap-1">
                  {b?.champion && (
                    <span className="text-[9px] leading-none text-signal-ink" aria-hidden>
                      ★
                    </span>
                  )}
                  <div
                    className="w-full max-w-4"
                    style={{
                      height: `${((b?.value ?? 0) / max) * 100}%`,
                      color: b?.color ?? 'var(--signal)',
                    }}
                  >
                    <GrowBar value={b ? 1 : 0} axis="y" className="rounded-t-[3px] bg-current" />
                    <span className="sr-only">{b ? `${y}: ${b.label}` : ''}</span>
                  </div>
                </div>
              </Hint>
            )
          })}
        </div>
      </div>
      <div className="flex justify-between font-mono text-[10px] text-faint-foreground">
        <span>{first}</span>
        <span>{unit}</span>
        <span>{last}</span>
      </div>
    </div>
  )
}
