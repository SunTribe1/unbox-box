import type { Transition, Variants } from 'motion/react'

/**
 * Motion presets. Every animation in the app uses these, so timings feel like one system.
 * Rules: UI changes finish under 300 ms, layout moves use springs, only transform and opacity
 * animate. MotionConfig reducedMotion="user" (providers.tsx) turns movement into fades.
 */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const

export const spring = {
  /** Indicators, pills, toggles: quick with no overshoot you can see. */
  snappy: { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 },
  /** Panels, sheets, rows that reorder. */
  gentle: { type: 'spring', stiffness: 320, damping: 34 },
} satisfies Record<string, Transition>

export const duration = { fast: 0.14, base: 0.22, slow: 0.32 } as const

/** Rows reordering under fast playback: short and linear-out, so a move finishes before the
 *  next update arrives and rows never pile up mid-slide. */
export const quickSlide: Transition = { duration: duration.fast, ease: EASE_OUT }

const fade: Transition = { duration: duration.base, ease: EASE_OUT }

/** Content that arrives: rises 6 px and fades in. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: fade },
  exit: { opacity: 0, y: -4, transition: { duration: duration.fast, ease: EASE_OUT } },
}

/** A parent that reveals its riseIn children one after another. */
export function stagger(step = 0.04, delay = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: step, delayChildren: delay } },
    exit: {},
  }
}

/** Spread onto an m.* element to play riseIn on mount. */
export const enter = { variants: riseIn, initial: 'hidden', animate: 'show', exit: 'exit' } as const
