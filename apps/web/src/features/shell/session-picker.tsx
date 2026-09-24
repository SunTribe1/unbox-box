'use client'

import {
  eventStem,
  groupSessions,
  normalizeText,
  type EventGroup,
  type SessionSummary,
} from '@unbox-box/tools'
import { useQuery } from '@tanstack/react-query'
import { ChevronDownIcon, HistoryIcon } from 'lucide-react'
import { m } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { formatEventDate } from '@/lib/format'
import { Hint } from '@/components/ui/hint'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { indexQuery } from '@/lib/data'
import { spring } from '@/lib/motion'
import { rememberSession, useRecentSessions } from '@/lib/recent-sessions'
import { useApp } from '@/lib/store'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

const SHORT: Record<string, string> = {
  'Sprint Qualifying': 'SQ',
  Sprint: 'S',
  Qualifying: 'Q',
  Race: 'R',
}

const shortEvent = (event: string) => event.replace(/ Grand Prix$/, '')

/** A session the search names ("monza race", "silverstone sprint q"), longest name first so
 *  "sprint qualifying" wins over "sprint" and "qualifying". */
function sessionNamed(group: EventGroup, query: string) {
  const q = query.toLowerCase()
  return [...group.sessions]
    .sort((a, b) => b.session.length - a.session.length)
    .find(
      (s) =>
        q.includes(s.session.toLowerCase()) ||
        q.split(/\s+/).includes((SHORT[s.session] ?? '').toLowerCase()),
    )
}

/** The session to open when an event is picked: the same type as now, else quali, else race. */
function preferredSession(group: EventGroup, current: SessionSummary | undefined) {
  const order = [current?.session, 'Qualifying', 'Race', 'Sprint', 'Sprint Qualifying']
  for (const kind of order) {
    const hit = group.sessions.find((s) => s.session === kind)
    if (hit) return hit
  }
  return group.sessions[0]!
}

function SeasonTabs({
  seasons,
  value,
  onChange,
}: {
  seasons: number[]
  value: number
  onChange: (season: number) => void
}) {
  return (
    // A radio group, not tabs: the list below filters by season, it isn't a tab panel.
    <ToggleGroup
      type="single"
      value={String(value)}
      onValueChange={(v) => v && onChange(Number(v))}
      aria-label="Season"
      className="no-scrollbar w-full justify-start gap-0.5 overflow-x-auto rounded-none border-b bg-transparent px-2 py-1.5 shadow-none"
    >
      {seasons.map((season) => (
        <ToggleGroupItem
          key={season}
          value={String(season)}
          className="relative h-7 flex-none border-0 bg-transparent px-2.5 numeric text-xs shadow-none data-[state=on]:bg-transparent"
        >
          {season === value && (
            <m.span
              layoutId="season-pill"
              className="absolute inset-0 rounded-md bg-surface-3"
              transition={spring.snappy}
            />
          )}
          <span className="relative">{season}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function EventRow({
  group,
  currentId,
  latest,
  showSeason,
  current,
  query,
  onPick,
}: {
  group: EventGroup
  query: string
  current: SessionSummary | undefined
  currentId: string | null
  latest: boolean
  showSeason: boolean
  onPick: (id: string) => void
}) {
  const here = group.sessions.some((s) => s.id === currentId)
  return (
    <CommandItem
      value={`${group.key} ${eventStem(group.event)} ${normalizeText(group.circuit)} ${normalizeText(group.country ?? '')} ${group.sessions.map((x) => x.session.toLowerCase()).join(' ')}`}
      onSelect={() => onPick((sessionNamed(group, query) ?? preferredSession(group, current)).id)}
      className="gap-3 py-2"
    >
      <span className="w-8 shrink-0 text-right numeric text-[11px] text-faint-foreground">
        {showSeason ? `’${String(group.season).slice(2)}` : (group.round ?? '')}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn('truncate font-medium', here && 'text-signal-ink')}>
            {shortEvent(group.event)}
          </span>
          {latest && (
            <span className="rounded-sm bg-signal-soft px-1 py-px text-[10px] font-semibold tracking-wide text-signal-ink uppercase">
              Latest
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {group.circuit} · {formatEventDate(group.date, { year: false })}
        </span>
      </span>
      <span className="sr-only">
        Sessions: {group.sessions.map((s) => s.session).join(', ')}. Type a session name to pick it.
      </span>
      {/* Shortcuts for the pointer; inside an option they can't be separate controls, so
          keyboard users choose a session by typing its name ("monza race"). */}
      <span className="flex shrink-0 gap-1" aria-hidden>
        {group.sessions.map((s) => (
          <Hint key={s.id} label={s.session}>
            <span
              role="presentation"
              onClick={(e) => {
                e.stopPropagation()
                onPick(s.id)
              }}
              className={cn(
                'inline-flex h-6 min-w-7 cursor-pointer items-center justify-center rounded-md border px-1.5 font-mono text-[11px] font-medium transition-colors',
                s.id === currentId
                  ? 'border-signal/60 bg-signal-soft text-signal-ink'
                  : 'text-muted-foreground hover:border-foreground/30 hover:text-foreground',
              )}
            >
              {SHORT[s.session] ?? s.session}
            </span>
          </Hint>
        ))}
      </span>
    </CommandItem>
  )
}

function useCurrentSummary() {
  const index = useQuery(indexQuery())
  const sessionId = useApp((s) => s.sessionId)
  return index.data?.sessions.find((s) => s.id === sessionId)
}

/** Season → event → session picker. Search spans every season. */
export function SessionPicker() {
  const index = useQuery(indexQuery())
  const sessionId = useApp((s) => s.sessionId)
  const setSession = useApp((s) => s.setSession)
  const current = useCurrentSummary()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [season, setSeason] = useState<number | null>(null)
  const recentIds = useRecentSessions()
  useEffect(() => {
    if (sessionId) rememberSession(sessionId)
  }, [sessionId])

  const groups = useMemo(() => groupSessions(index.data?.sessions ?? []), [index.data])
  const latestKey = groups[0]?.events[0]?.key
  const shownSeason = season ?? current?.season ?? groups[0]?.season ?? null
  const searching = query.trim().length > 0
  const events = searching
    ? groups.flatMap((g) => g.events)
    : (groups.find((g) => g.season === shownSeason)?.events ?? [])

  if (!index.data || !current) return <Skeleton className="h-5 w-64" />
  const byId = new Map(index.data.sessions.map((x) => [x.id, x]))
  const recent = recentIds
    .filter((id) => id !== sessionId)
    .map((id) => byId.get(id))
    .filter((x): x is SessionSummary => !!x)
    .slice(0, 3)

  const pick = (id: string) => {
    setOpen(false)
    setQuery('')
    setSeason(null)
    if (id !== sessionId) setSession(id)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSeason(null)
      }}
    >
      <PopoverTrigger className="group flex h-9 min-w-0 shrink-0 items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-surface-2 data-[state=open]:bg-surface-2">
        <span className="numeric text-xs leading-none text-muted-foreground max-sm:hidden">
          {current.season}
        </span>
        <span className="truncate leading-none font-medium">{shortEvent(current.event)}</span>
        {/* The accessible name starts with the visible text (WCAG 2.5.3), then says what it does. */}
        <span className="sr-only">Grand Prix, change session</span>
        <span className="inline-flex h-5 shrink-0 items-center rounded-sm border px-1 font-mono text-[11px] leading-none text-muted-foreground">
          <span className="sm:hidden">{SHORT[current.session] ?? current.session}</span>
          <span className="hidden sm:inline">{current.session}</span>
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(520px,calc(100vw-1.5rem))] p-0">
        <Command
          label="Search sessions"
          shouldFilter={searching}
          loop
          className="**:data-[slot=command-input-wrapper]:h-12"
        >
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search events, circuits, countries…"
            aria-label="Search sessions"
          />
          {!searching && (
            <SeasonTabs
              seasons={groups.map((g) => g.season)}
              value={shownSeason ?? 0}
              onChange={setSeason}
            />
          )}
          <CommandList className="max-h-[min(420px,60dvh)]">
            <CommandEmpty>No events match “{query}”.</CommandEmpty>
            {!searching && recent.length > 0 && (
              <CommandGroup heading="Recent" className="border-b pb-1.5">
                {recent.map((x) => (
                  <CommandItem key={x.id} value={`recent ${x.id}`} onSelect={() => pick(x.id)}>
                    <HistoryIcon />
                    <span className="numeric text-xs text-muted-foreground">{x.season}</span>
                    <span className="font-medium">{shortEvent(x.event)}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{x.session}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {events.map((group) => (
              <EventRow
                key={group.key}
                group={group}
                showSeason={searching}
                current={current}
                currentId={sessionId}
                latest={group.key === latestKey}
                query={query}
                onPick={pick}
              />
            ))}
          </CommandList>
          <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-faint-foreground">
            <span>
              {index.data.sessions.length} sessions · {groups.length}{' '}
              {groups.length === 1 ? 'season' : 'seasons'}
            </span>
            <span className="font-mono">SQ · S · Q · R</span>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
