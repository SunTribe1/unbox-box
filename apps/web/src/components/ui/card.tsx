import * as React from 'react'
import { cn } from '@/lib/utils'

/*
 * shadcn Card, tuned for a data-dense dashboard: the shell carries no padding (charts and
 * tables run edge to edge), the header is a row with the title on the left and meta or
 * actions on the right, and titles use the small-caps label style.
 */

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex min-w-0 flex-col rounded-xl border border-border-accent bg-card text-card-foreground shadow-card',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pt-3.5 pb-2.5 sm:px-5',
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    // The heading's text arrives through props.children.
    // eslint-disable-next-line jsx-a11y/heading-has-content
    <h2
      data-slot="card-title"
      className={cn(
        'text-title text-foreground has-[>svg]:flex has-[>svg]:items-center has-[>svg]:gap-2 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-caption text-muted-foreground', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('ml-auto flex items-center gap-1.5', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('px-4 pb-4 sm:px-5 sm:pb-5', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex items-center border-t px-4 py-2.5 text-caption text-faint-foreground sm:px-5',
        className,
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
