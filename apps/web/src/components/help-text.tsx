import { InfoIcon, TriangleAlertIcon } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

/** The one style for hints and footnotes: a muted info icon, then caption text. The icon
 *  sits on the first line, so wrapped text stays aligned and one-liners are centred. */
export function HelpText({
  children,
  className,
  as: Tag = 'p',
  tone = 'info',
}: {
  children: React.ReactNode
  className?: string
  as?: 'p' | 'div'
  /** `warning` flags a data caveat (amber icon), same layout. */
  tone?: 'info' | 'warning'
}) {
  const Icon = tone === 'warning' ? TriangleAlertIcon : InfoIcon
  return (
    <Tag className={cn('flex items-start gap-1.5 text-caption text-muted-foreground', className)}>
      <Icon
        className={cn(
          'mt-[0.1rem] size-3.5 shrink-0',
          tone === 'warning' ? 'text-signal-ink' : 'text-faint-foreground',
        )}
        aria-hidden
      />
      <span className="min-w-0">{children}</span>
    </Tag>
  )
}
