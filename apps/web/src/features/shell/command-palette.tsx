'use client'

import {
  findDriver,
  findSession,
  matchSessions,
  suggestionsFor,
  trackSections,
  VIEWS,
} from '@unbox-box/tools'
import { useQuery } from '@tanstack/react-query'
import { CalendarIcon, InfoIcon, MapPinIcon, MoonIcon, SparklesIcon } from 'lucide-react'
import { DriverIcon, EngineerIcon } from '@/components/icons'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { indexQuery } from '@/lib/data'
import { useApp } from '@/lib/store'
import { ask } from '../agent/ask-lazy'
import { useSessionMeta } from '../lap-duel/use-duel'

export function CommandPalette() {
  const open = useApp((s) => s.paletteOpen)
  const setOpen = useApp((s) => s.setPaletteOpen)
  const setAgentOpen = useApp((s) => s.setAgentOpen)
  const meta = useSessionMeta().data
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!useApp.getState().paletteOpen)
      }
      if (e.key === 'Escape' && !useApp.getState().paletteOpen) useApp.getState().setCorner(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  const run = (question: string) => {
    setOpen(false)
    setQuery('')
    setAgentOpen(true)
    void ask(question)
  }

  const pole = meta?.results[0]?.driver
  const index = useQuery(indexQuery()).data
  const sessionId = useApp((s) => s.sessionId)
  const sessionHits = (() => {
    const q = query.trim()
    if (!index || q.length < 3) return []
    const hit = findSession(q, index.sessions, sessionId)
    const byEvent = matchSessions(index.sessions, { event: q }).slice(0, 6)
    return [...new Map([...(hit ? [hit.session] : []), ...byEvent].map((s) => [s.id, s])).values()]
  })()
  const openSession = (id: string) => {
    setOpen(false)
    setQuery('')
    useApp.getState().setSession(id)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[12dvh] translate-y-0 overflow-hidden p-0 shadow-pop sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Search or ask</DialogTitle>
        <DialogDescription className="sr-only">
          Ask the Race Engineer, jump to a driver or a corner, or change settings.
        </DialogDescription>
        <Command label="Search or ask" loop className="**:data-[slot=command-input-wrapper]:h-12">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Ask anything, or jump to a driver or corner…"
          />
          <CommandList>
            {query.trim() && (
              <CommandGroup heading="Race Engineer" forceMount>
                <CommandItem value={`ask ${query}`} onSelect={() => run(query)} forceMount>
                  <EngineerIcon className="text-signal-ink" /> Ask: “{query}”
                </CommandItem>
              </CommandGroup>
            )}
            {sessionHits.length > 0 && (
              <CommandGroup heading="Sessions" forceMount>
                {sessionHits.map((x) => (
                  <CommandItem
                    key={x.id}
                    value={`session ${x.id}`}
                    onSelect={() => openSession(x.id)}
                    forceMount
                  >
                    <CalendarIcon />
                    <span className="numeric text-xs text-muted-foreground">{x.season}</span>
                    {x.event.replace(/ Grand Prix$/, '')}
                    <span className="ml-auto text-xs text-muted-foreground">{x.session}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="Try asking">
              {[...new Set([...VIEWS.flatMap((v) => suggestionsFor(v, meta))])].map((s) => (
                <CommandItem key={s} value={s} onSelect={() => run(s)}>
                  <SparklesIcon /> {s}
                </CommandItem>
              ))}
            </CommandGroup>
            {meta && (
              <CommandGroup heading="Drivers">
                {meta.results.map((r) => {
                  const d = findDriver(meta, r.driver)
                  const other = r.driver === pole ? meta.results[1]?.driver : pole
                  return (
                    <CommandItem
                      key={r.driver}
                      value={`${r.driver} ${d?.firstName} ${d?.lastName}`}
                      onSelect={() => run(`Compare ${r.driver} and ${other}`)}
                    >
                      <DriverIcon />
                      <span className="font-mono">{r.driver}</span> {d?.firstName} {d?.lastName}
                      <span className="ml-auto text-xs text-muted-foreground">vs {other}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
            {meta && (
              <CommandGroup heading="Corners">
                {trackSections(meta).map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`${s.name} ${s.turns} turn ${s.corners.join(' ')} ${Object.entries(
                      meta.circuit.aliases,
                    )
                      .filter(([, n]) => s.corners.includes(n))
                      .map(([alias]) => alias)
                      .join(' ')}`}
                    onSelect={() => run(`Show me turn ${s.corners[0]}`)}
                  >
                    <MapPinIcon /> {s.name}
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {s.turns}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup heading="Settings">
              <CommandItem
                value="toggle theme dark light"
                onSelect={() => {
                  setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
                  setOpen(false)
                }}
              >
                <MoonIcon /> Toggle light / dark theme
              </CommandItem>
              <CommandItem
                value="credits licenses attribution"
                onSelect={() => {
                  setOpen(false)
                  router.push('/credits/')
                }}
              >
                <InfoIcon /> Credits and licences
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
