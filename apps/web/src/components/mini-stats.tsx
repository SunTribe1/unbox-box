import type * as React from 'react'

/** Three or so small figures in a row, for the foot of a tile. */
export function MiniStats({
  items,
}: {
  items: readonly (readonly [label: string, value: React.ReactNode])[]
}) {
  return (
    <dl className="grid auto-cols-fr grid-flow-col gap-2 text-center">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md bg-surface-2 py-1.5">
          <dt className="truncate px-1 text-[10px] text-muted-foreground uppercase">{label}</dt>
          <dd className="numeric text-sm font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
