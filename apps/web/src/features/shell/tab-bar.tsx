'use client'

import { EllipsisIcon } from 'lucide-react'
import { m } from 'motion/react'
import { useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { spring } from '@/lib/motion'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { goTo, NAV, PRIMARY_VIEWS } from './nav'

const tabClass =
  'relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium transition-colors active:scale-[0.97]'

function Pill() {
  return (
    <m.span
      layoutId="tab-pill"
      className="absolute inset-x-1.5 inset-y-0 rounded-lg bg-surface-2"
      transition={spring.snappy}
    />
  )
}

/** Bottom navigation on phones, where the rail is hidden: the session views plus History,
 *  and a "More" sheet for the archive. */
export function TabBar() {
  const view = useApp((s) => s.view)
  const [more, setMore] = useState(false)
  const primary = NAV.filter((n) => PRIMARY_VIEWS.includes(n.view))
  const rest = NAV.filter((n) => !PRIMARY_VIEWS.includes(n.view))
  const inRest = rest.some((n) => n.view === view)
  const current = rest.find((n) => n.view === view)
  const MoreIcon = current?.icon ?? EllipsisIcon

  return (
    <>
      <nav
        aria-label="Main"
        className="grid shrink-0 grid-cols-5 border-t bg-surface-1 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden"
      >
        {primary.map(({ view: v, short, label, icon: Icon }) => {
          const active = view === v
          return (
            <button
              key={v}
              type="button"
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              onClick={() => goTo(v)}
              className={cn(tabClass, active ? 'text-foreground' : 'text-muted-foreground')}
            >
              {active && <Pill />}
              <Icon
                className={cn('relative size-[18px]', active && 'text-signal-ink glow-icon')}
                aria-hidden
              />
              <span className="relative">{short}</span>
            </button>
          )
        })}
        <button
          type="button"
          aria-label={current ? `${current.label} (more sections)` : 'More sections'}
          aria-haspopup="dialog"
          aria-current={inRest ? 'page' : undefined}
          onClick={() => setMore(true)}
          className={cn(tabClass, inRest ? 'text-foreground' : 'text-muted-foreground')}
        >
          {inRest && <Pill />}
          <MoreIcon
            className={cn('relative size-[18px]', inRest && 'text-signal-ink glow-icon')}
            aria-hidden
          />
          <span className="relative">{current?.short ?? 'More'}</span>
        </button>
      </nav>

      <Drawer open={more} onOpenChange={setMore}>
        <DrawerContent className="md:hidden">
          <DrawerHeader className="text-left">
            <DrawerTitle>More</DrawerTitle>
            <DrawerDescription>The archive back to 1950, and help.</DrawerDescription>
          </DrawerHeader>
          <ul className="grid gap-1 px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {rest.map(({ view: v, label, blurb, icon: Icon }) => (
              <li key={v}>
                <button
                  type="button"
                  aria-current={view === v ? 'page' : undefined}
                  onClick={() => {
                    setMore(false)
                    goTo(v)
                  }}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-2',
                    view === v && 'bg-surface-2',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-5 shrink-0 text-muted-foreground',
                      view === v && 'text-signal-ink',
                    )}
                    aria-hidden
                  />
                  <span className="grid min-w-0">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="truncate text-caption text-muted-foreground">{blurb}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DrawerContent>
      </Drawer>
    </>
  )
}
