'use client'

import type * as React from 'react'
import {
  CalendarIcon,
  MapPinIcon,
  RouteIcon,
  SearchIcon,
  ThermometerIcon,
  ThermometerSunIcon,
} from 'lucide-react'
import { formatEventDate } from '@/lib/format'
import { EngineerIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { useApp } from '@/lib/store'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { useSessionMeta } from '../lap-duel/use-duel'
import { FetchProgress } from './fetch-progress'
import { Logo, Wordmark } from './logo'
import { SessionPicker } from './session-picker'
import { ShareMenu } from './share-menu'
import { ThemeToggle } from './theme-toggle'
import Link from 'next/link'
import { openLapDuel } from './nav'

/** One session fact in the top bar: a muted 14px icon, then the value. */
function MetaItem({
  icon: Icon,
  label,
  className,
  children,
}: {
  icon: React.ElementType
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <li className={cn('flex shrink-0 items-center gap-1.5 whitespace-nowrap', className)}>
      <Icon className="size-3.5 shrink-0 text-faint-foreground" aria-hidden />
      <span className="sr-only">{label}: </span>
      {children}
    </li>
  )
}

/** Opens the Race Engineer: a slide-over on smaller screens, or docks/hides it on wide ones
 *  (where it is pressed while docked). */
function EngineerToggle() {
  const wide = useMediaQuery('(min-width: 1280px)')
  const docked = useApp((s) => s.agentDocked)
  const setAgentOpen = useApp((s) => s.setAgentOpen)
  const setAgentDocked = useApp((s) => s.setAgentDocked)
  const open = useApp((s) => s.agentOpen)
  const active = wide && docked
  // The live dot shows while the engineer is out of sight, so it never nags when open.
  const live = wide ? !docked : !open
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={wide ? docked : undefined}
      onClick={() => (wide ? setAgentDocked(!docked) : setAgentOpen(true))}
      aria-label={
        wide ? (docked ? 'Hide Race Engineer' : 'Show Race Engineer') : 'Open Race Engineer'
      }
      className={cn(active && 'bg-surface-2 dark:bg-surface-2')}
    >
      <span className="relative flex">
        <EngineerIcon className="text-foreground" />
        {live && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 size-2 animate-blink rounded-full bg-signal ring-2 glow-dot ring-surface-1"
          />
        )}
      </span>
      <span className="hidden sm:inline">Race Engineer</span>
    </Button>
  )
}

export function TopBar() {
  const meta = useSessionMeta()
  const setPaletteOpen = useApp((s) => s.setPaletteOpen)
  const m = meta.data

  return (
    <header className="@container/topbar relative flex h-14 shrink-0 items-center gap-3 border-b bg-surface-1 px-4">
      <Logo className="size-8 md:hidden" />
      {/* The full name on every page; the rail beside it carries the square mark. */}
      {/* Inside the app, the logo goes to Lap Duel (the landing page is for visitors). */}
      <Link
        href="/duel/"
        onClick={openLapDuel}
        aria-label="Unbox Box: Lap Duel"
        className="hidden shrink-0 items-center gap-3 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:flex"
      >
        <Wordmark className="w-[92px] text-foreground" label="" />
        <span className="h-6 w-px bg-border" aria-hidden />
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SessionPicker />
        {m && (
          <ul
            aria-label="Session details"
            className="hidden min-w-0 items-center gap-x-4 overflow-hidden text-xs text-muted-foreground lg:flex"
          >
            <MetaItem icon={MapPinIcon} label="Circuit" className="min-w-0">
              <span className="truncate">{m.circuit.name}</span>
            </MetaItem>
            <MetaItem icon={CalendarIcon} label="Date" className="@max-[1010px]/topbar:hidden">
              {formatEventDate(m.date)}
            </MetaItem>
            <MetaItem icon={RouteIcon} label="Lap length" className="@max-[1110px]/topbar:hidden">
              <span className="numeric">{(m.telemetry.length / 1000).toFixed(3)}</span> km
            </MetaItem>
            {m.weather.airTemp != null && (
              <MetaItem
                icon={ThermometerIcon}
                label="Air temperature"
                className="@max-[1250px]/topbar:hidden"
              >
                <span className="numeric">{m.weather.airTemp}°C</span> air
              </MetaItem>
            )}
            {m.weather.trackTemp != null && (
              <MetaItem
                icon={ThermometerSunIcon}
                label="Track temperature"
                className="@max-[1350px]/topbar:hidden"
              >
                <span className="numeric">{m.weather.trackTemp}°C</span> track
              </MetaItem>
            )}
          </ul>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="hidden text-muted-foreground sm:inline-flex"
        onClick={() => setPaletteOpen(true)}
      >
        <SearchIcon /> Search or ask <Kbd>⌘K</Kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="sm:hidden"
        onClick={() => setPaletteOpen(true)}
        aria-label="Search or ask"
      >
        <SearchIcon />
      </Button>
      <ShareMenu />
      <ThemeToggle />
      <FetchProgress />
      <EngineerToggle />
    </header>
  )
}
