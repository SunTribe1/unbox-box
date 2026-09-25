import { ArrowRightIcon, ArrowUpRightIcon } from 'lucide-react'
import { m, useReducedMotion } from 'motion/react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

/** A section marker: a short red rule and a sentence-case label. */
export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-center gap-3 text-eyebrow text-white/60', className)}>
      <span className="h-px w-6 bg-signal glow-dot" aria-hidden />
      {children}
    </p>
  )
}

/** HUD corner brackets around a block (decorative). */
export function Brackets({ className }: { className?: string }) {
  const corner = 'absolute size-3 border-white/25'
  return (
    <span aria-hidden className={cn('pointer-events-none absolute inset-0', className)}>
      <span className={cn(corner, 'top-0 left-0 border-t border-l')} />
      <span className={cn(corner, 'top-0 right-0 border-t border-r')} />
      <span className={cn(corner, 'bottom-0 left-0 border-b border-l')} />
      <span className={cn(corner, 'right-0 bottom-0 border-r border-b')} />
    </span>
  )
}

/** Small "+" marks at the four corners of a block, like a layout grid's intersections. */
export function Crosshairs({ className }: { className?: string }) {
  const mark =
    'absolute size-3 before:absolute before:top-1/2 before:left-0 before:h-px before:w-full before:bg-white/35 after:absolute after:top-0 after:left-1/2 after:h-full after:w-px after:bg-white/35'
  return (
    <span aria-hidden className={cn('pointer-events-none absolute inset-0', className)}>
      <span className={cn(mark, '-top-1.5 -left-1.5')} />
      <span className={cn(mark, '-top-1.5 -right-1.5')} />
      <span className={cn(mark, '-bottom-1.5 -left-1.5')} />
      <span className={cn(mark, '-right-1.5 -bottom-1.5')} />
    </span>
  )
}

/** A product window: title bar with the view's name and a live chip, crosshair corners. */
export function AppWindow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <Crosshairs />
      <div className="glow-hover overflow-hidden rounded-xl border border-white/10 bg-[#0e0f12]">
        <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2 rounded-full bg-white/15" />
            ))}
          </span>
          <span className="truncate text-eyebrow text-white/55">Unbox Box — {title}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-sm border border-white/12 px-1.5 py-0.5 text-eyebrow text-white/60">
            <span className="size-1.5 rounded-full bg-signal glow-dot" aria-hidden />
            Live
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Film grain over a dark area. A static SVG noise tile: no animation, no network. */
export function Grain({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 bg-grain opacity-[0.07] mix-blend-overlay',
        className,
      )}
    />
  )
}

const arrowLink =
  'group inline-flex w-fit items-center gap-2 rounded-sm text-sm font-medium text-signal-ink underline-offset-4 hover:underline'
const arrow = 'size-4 transition-transform duration-200 motion-reduce:transition-none'

/** The one text link style on the landing page: red, with an arrow that nudges on hover.
 *  Pass `onClick` to go into the app (behind the lights), or `href` for another page: a site
 *  path opens in place, an external address in a new tab (with an up-right arrow). */
export function ArrowLink({
  children,
  onClick,
  href,
  className,
  ...aria
}: {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  className?: string
  'aria-expanded'?: boolean
  'aria-controls'?: string
}) {
  if (href?.startsWith('/')) {
    return (
      <a href={href} className={cn(arrowLink, className)}>
        {children}
        <ArrowRightIcon className={cn(arrow, 'group-hover:translate-x-1')} aria-hidden />
      </a>
    )
  }
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cn(arrowLink, className)}>
        {children}
        <ArrowUpRightIcon
          className={cn(arrow, 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5')}
          aria-hidden
        />
      </a>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cn(arrowLink, className)} {...aria}>
      {children}
      <ArrowRightIcon className={cn(arrow, 'group-hover:translate-x-1')} aria-hidden />
    </button>
  )
}

/** A glowing red bullet that pulses three times when it scrolls into view, then stays lit.
 *  A few pulses, not a loop: WCAG 2.2.2 allows blinking for at most five seconds. */
export function PulseDot({ index = 0 }: { index?: number }) {
  const reduce = useReducedMotion()
  const dot = 'glow-dot size-1.5 shrink-0 rounded-full bg-signal'
  if (reduce) return <span className={dot} aria-hidden />
  return (
    <m.span
      className={dot}
      aria-hidden
      initial={{ opacity: 1 }}
      whileInView={{ opacity: [1, 0.2, 1] }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.9, repeat: 2, delay: 0.3 + index * 0.18, ease: 'easeInOut' }}
    />
  )
}
