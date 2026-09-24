import type * as React from 'react'
import { cn } from '@/lib/utils'

/** The title row of an index page: icon, title and one line of context on the left, the
 *  page's filters on the right. Wraps onto two lines on narrow screens. */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  className,
}: {
  icon: React.ElementType
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="grid gap-0.5">
        <h2 className="flex items-center gap-2 text-title">
          <Icon className="size-5 text-muted-foreground" aria-hidden /> {title}
        </h2>
        {description && <p className="text-caption text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
