'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import type { View } from '@unbox-box/tools'
import type * as React from 'react'
import { useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { DOCK_KEY, useApp } from '@/lib/store'
import { useBootstrap } from '@/lib/use-bootstrap'
import { VIEW_META } from '@/lib/view-meta'
import { useTeamColors } from '@/lib/use-team-colors'
import { useMediaQuery } from '@/lib/use-media-query'
import { AgentPanel } from '../agent/agent-panel'
import { useWebMcp } from '../agent/webmcp-bridge'
import { CommandPalette } from './command-palette'
import { goTo, NAV } from './nav'
import { ShortcutsDialog } from './shortcuts-dialog'
import { Sidebar } from './sidebar'
import { TabBar } from './tab-bar'
import { TopBar } from './top-bar'
import { DISCLAIMER_SHORT } from '@/lib/legal'

// Each view is its own chunk: opening the app loads only the view on screen.
function ViewSkeleton() {
  return (
    <div className="grid gap-4" aria-busy aria-label="Loading view">
      <Skeleton className="h-9 w-full max-w-xl" />
      <Skeleton className="h-[480px] rounded-xl" />
    </div>
  )
}
const LapDuel = dynamic(() => import('../lap-duel/lap-duel').then((x) => x.LapDuel), {
  loading: ViewSkeleton,
})
const ReplayView = dynamic(() => import('../replay/replay-view').then((x) => x.ReplayView), {
  loading: ViewSkeleton,
})
const StrategyView = dynamic(
  () => import('../strategy/strategy-view').then((x) => x.StrategyView),
  { loading: ViewSkeleton },
)
const CircuitsView = dynamic(
  () => import('../circuits/circuits-view').then((x) => x.CircuitsView),
  { loading: () => <Skeleton className="h-[560px] rounded-xl" /> },
)
const HistoryView = dynamic(() => import('../history/history-view').then((x) => x.HistoryView), {
  loading: ViewSkeleton,
})
const RacesView = dynamic(() => import('../races/races-view').then((x) => x.RacesView), {
  loading: ViewSkeleton,
})
const RecordsView = dynamic(() => import('../records/records-view').then((x) => x.RecordsView), {
  loading: ViewSkeleton,
})
const EnginesView = dynamic(() => import('../engines/engines-view').then((x) => x.EnginesView), {
  loading: ViewSkeleton,
})
const HelpView = dynamic(() => import('../help/help-view').then((x) => x.HelpView), {
  loading: ViewSkeleton,
})
const NationsView = dynamic(() => import('../nations/nations-view').then((x) => x.NationsView), {
  loading: ViewSkeleton,
})

const VIEWS_BY_ID: Record<View, React.ComponentType> = {
  'lap-duel': LapDuel,
  replay: ReplayView,
  strategy: StrategyView,
  history: HistoryView,
  races: RacesView,
  circuits: CircuitsView,
  records: RecordsView,
  engines: EnginesView,
  nations: NationsView,
  help: HelpView,
}

const VIEW_TITLES = Object.fromEntries(NAV.map((n) => [n.view, n.label])) as Record<View, string>

/** 1–9 switch views, unless the user is typing or a dialog is open. */
function useViewShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || target.isContentEditable) return
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (useApp.getState().paletteOpen) return
      const item = NAV[Number(e.key) - 1]
      if (item) goTo(item.view)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** Restores the docked/collapsed Race Engineer choice after hydration (the prerendered HTML
 *  always assumes docked), and lets "/" reopen a collapsed panel. */
function useDockPreference() {
  useEffect(() => {
    try {
      if (localStorage.getItem(DOCK_KEY) === '0') useApp.setState({ agentDocked: false })
    } catch {
      // Storage blocked: keep the default.
    }
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key !== '/' || ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      const { agentDocked, setAgentDocked, setAgentOpen } = useApp.getState()
      if (window.matchMedia('(min-width: 1280px)').matches) {
        if (!agentDocked) {
          e.preventDefault()
          setAgentDocked(true)
        }
      } else {
        e.preventDefault()
        setAgentOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

function CurrentView() {
  const view = useApp((s) => s.view)
  // Client-side view switches keep the tab title in step with the page's own title.
  useEffect(() => {
    document.title = `${VIEW_META[view].title} · Unbox Box`
  }, [view])
  const View = VIEWS_BY_ID[view] ?? LapDuel
  return <View />
}

export function AppShell() {
  useBootstrap()
  useViewShortcuts()
  useTeamColors()
  const webmcp = useWebMcp()
  // Exactly one agent panel is mounted: docked on wide screens, a slide-over otherwise.
  const wide = useMediaQuery('(min-width: 1280px)')
  const agentOpen = useApp((s) => s.agentOpen)
  const agentDocked = useApp((s) => s.agentDocked)
  const view = useApp((s) => s.view)
  const setAgentOpen = useApp((s) => s.setAgentOpen)
  const setAgentDocked = useApp((s) => s.setAgentDocked)
  useDockPreference()

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" className="@container min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[2000px] px-3 py-4 md:px-4 md:py-5">
            <h1 className="sr-only">{VIEW_TITLES[view]}</h1>
            {/* Keyed CSS entrance: replays on every view switch, needs no JS to finish, so
                content can never be stranded invisible (reduced motion disables it). */}
            <div key={view} className="animate-view-in">
              <CurrentView />
            </div>
            <footer className="mt-8 border-t pt-4 pb-2 text-[11px] leading-relaxed text-faint-foreground">
              {DISCLAIMER_SHORT} All other names are trade marks of their respective owners, who do
              not endorse this app. Data: TracingInsights (MIT, Apache-2.0), F1DB (CC BY 4.0).
              Flags: flag-icons (MIT).{' '}
              <Link href="/credits/" className="underline underline-offset-2 hover:text-foreground">
                Credits and full disclaimer
              </Link>
            </footer>
          </div>
        </main>
        <TabBar />
      </div>

      {/* `hidden xl:block`: the prerendered HTML assumes a wide screen, so CSS hides the dock
          on phones before hydration decides. */}
      {wide && agentDocked && (
        <div className="hidden w-[400px] shrink-0 animate-dock-in border-l xl:block">
          <AgentPanel webmcp={webmcp} onCollapse={() => setAgentDocked(false)} />
        </div>
      )}

      {/* Smaller screens: a sheet (focus trap, Escape and scroll lock come with it). */}
      {!wide && (
        <Sheet open={agentOpen} onOpenChange={setAgentOpen}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="w-full gap-0 border-l p-0 sm:max-w-[420px]"
            aria-describedby={undefined}
            // Focus the sheet, not its first control: that would pop a tooltip, and focusing
            // the input would throw up the phone keyboard before anyone asked for it.
            onOpenAutoFocus={(e) => {
              e.preventDefault()
              ;(e.currentTarget as HTMLElement | null)?.focus()
            }}
          >
            <SheetTitle className="sr-only">Race Engineer</SheetTitle>
            <AgentPanel webmcp={webmcp} onClose={() => setAgentOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
      <CommandPalette />
      <ShortcutsDialog />
    </div>
  )
}
