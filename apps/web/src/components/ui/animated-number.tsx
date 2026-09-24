'use client'

import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { EASE_OUT } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface AnimatedNumberProps {
  value: number | null | undefined
  format: (value: number) => string
  /** Shown when there's no value. */
  fallback?: string
  duration?: number
  className?: string
}

/** Counts from the previous value to the new one. Text is written straight to the DOM, so
 *  React doesn't re-render per frame. Tabular figures keep the width steady while it runs. */
export function AnimatedNumber({
  value,
  format,
  fallback = '—',
  duration = 0.45,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef<number | null>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (value == null || !Number.isFinite(value)) {
      el.textContent = fallback
      shown.current = null
      return
    }
    const from = shown.current
    shown.current = value
    if (from == null || reduce || from === value) {
      el.textContent = format(value)
      return
    }
    const controls = animate(from, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => {
        el.textContent = format(v)
      },
    })
    return () => controls.stop()
  }, [value, format, fallback, duration, reduce])

  return (
    <span ref={ref} className={cn('tabular', className)}>
      {value == null || !Number.isFinite(value) ? fallback : format(value)}
    </span>
  )
}
