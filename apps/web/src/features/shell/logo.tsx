'use client'

import { cn } from '@/lib/utils'
import { useId } from 'react'
import {
  MARK_CROSSING,
  MARK_RED,
  MARK_WHITE,
  WORDMARK_INK,
  WORDMARK_RED,
  WORDMARK_VIEWBOX,
} from '@/components/brand/brand-paths'

/** The brand red of the "BOX" panel. */
const BRAND_RED = '#e62424'

/** The Unbox Box wordmark. The letters take the text colour, so it reads in both themes. */
export function Wordmark({
  className,
  label = 'Unbox Box',
}: {
  className?: string
  label?: string
}) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      className={cn('h-auto', className)}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      <path fill="currentColor" fillRule="evenodd" d={WORDMARK_INK} />
      <path fill={BRAND_RED} fillRule="evenodd" d={WORDMARK_RED} />
    </svg>
  )
}

/** The app mark: two linked boxes, white and red, on a black tile with a red edge. */
export function Logo({ className }: { className?: string }) {
  const clip = useId()
  const gap = { stroke: '#0a0a0b', strokeWidth: 2, paintOrder: 'stroke' } as const
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <rect {...MARK_CROSSING} />
        </clipPath>
      </defs>
      <rect
        x="1.25"
        y="1.25"
        width="61.5"
        height="61.5"
        rx="14"
        fill="#0a0a0b"
        stroke={BRAND_RED}
        strokeWidth="2.5"
      />
      <path d={MARK_RED} fill={BRAND_RED} fillRule="evenodd" />
      <path d={MARK_WHITE} fill="#ffffff" fillRule="evenodd" {...gap} />
      <path d={MARK_RED} fill={BRAND_RED} fillRule="evenodd" {...gap} clipPath={`url(#${clip})`} />
    </svg>
  )
}
