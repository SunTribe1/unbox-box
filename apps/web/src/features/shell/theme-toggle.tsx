'use client'

import { MoonIcon, SunIcon } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useTheme } from 'next-themes'
import type * as React from 'react'
import { flushSync } from 'react-dom'
import { Button } from '@/components/ui/button'
import { EASE_OUT } from '@/lib/motion'

const REVEAL_MS = 480

/** Switches theme. Where the View Transitions API exists, the new theme grows as a circle
 *  from the button; elsewhere, and with reduced motion, it switches instantly. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const reduce = useReducedMotion()
  const dark = resolvedTheme !== 'light'

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = dark ? 'light' : 'dark'
    if (reduce || typeof document.startViewTransition !== 'function') {
      setTheme(next)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(next))
    })
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          {
            duration: REVEAL_MS,
            easing: `cubic-bezier(${EASE_OUT.join(',')})`,
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
      .catch(() => {})
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  )
}
