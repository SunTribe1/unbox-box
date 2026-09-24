import type * as React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** A card in a grid that opens something: lifts on hover, rings on keyboard focus. */
export function TileButton({
  onClick,
  className,
  children,
  label,
}: {
  onClick: () => void
  className?: string
  children: React.ReactNode
  /** Accessible name when the visible text isn't enough. */
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group block h-full w-full text-left focus-visible:outline-none"
    >
      <Card
        className={cn(
          'h-full p-4 transition-[transform,border-color] duration-200 group-hover:-translate-y-0.5 group-hover:border-border-strong group-focus-visible:ring-2 group-focus-visible:ring-ring motion-reduce:transition-none motion-reduce:group-hover:translate-y-0',
          className,
        )}
      >
        {children}
      </Card>
    </button>
  )
}
