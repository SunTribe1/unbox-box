import type * as React from 'react'
import { cn } from '@/lib/utils'

/** A labelled figure: uppercase caption above a large tabular number. */
export function StatTile({
  label,
  value,
  detail,
  className,
}: {
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid min-w-0 gap-1 rounded-lg bg-surface-2 px-3 py-2.5', className)}>
      <span className="truncate text-label text-muted-foreground">{label}</span>
      <span className="numeric text-xl leading-none font-semibold">{value}</span>
      {detail && <span className="truncate text-caption text-muted-foreground">{detail}</span>}
    </div>
  )
}
