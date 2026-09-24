'use client'

import { m } from 'motion/react'
import { cn } from '@/lib/utils'

interface GrowBarProps {
  /** Filled fraction, 0 to 1. */
  value: number
  axis?: 'x' | 'y'
  /** Which edge the bar grows from. */
  from?: 'start' | 'end'
  delay?: number
  className?: string
}

const growSpring = { type: 'spring', stiffness: 210, damping: 30 } as const

/** A bar that fills its box by scaling (transform only, so it never triggers layout). The
 *  parent sets the box size; `className` sets color and radius. */
export function GrowBar({ value, axis = 'x', from = 'start', delay = 0, className }: GrowBarProps) {
  const v = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
  const horizontal = axis === 'x'
  return (
    <m.span
      aria-hidden
      className={cn('block size-full', className)}
      style={
        horizontal ? { originX: from === 'start' ? 0 : 1 } : { originY: from === 'start' ? 1 : 0 }
      }
      initial={horizontal ? { scaleX: 0 } : { scaleY: 0 }}
      animate={horizontal ? { scaleX: v } : { scaleY: v }}
      transition={{ ...growSpring, delay }}
    />
  )
}
