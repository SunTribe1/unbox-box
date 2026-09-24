'use client'

import { signatureTeam, type HistoryTab } from '@unbox-box/tools'
import type * as React from 'react'
import { m } from 'motion/react'
import { DriverIcon, HelmetIcon, StrategyIcon } from '@/components/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, ScrollTabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApp } from '@/lib/store'
import { duelColors } from '@/lib/teams'
import { useThemeName } from '@/lib/use-team-colors'
import { enter } from '@/lib/motion'
import { ErrorState } from '@/components/ui/error-state'
import { useSessionMeta } from '../lap-duel/use-duel'
import { HeadToHeadCard } from './head-to-head-card'
import { DriverProfileView } from './driver-profile'
import { TeamProfileView } from './team-profile'
import { useHeadToHeadPair, useHistoryData, useProfileTargets, useStandings } from './use-history'

export function HistoryView() {
  const history = useHistoryData()
  const meta = useSessionMeta()
  const pair = useHeadToHeadPair(history.data, meta.data)
  const targets = useProfileTargets(history.data, meta.data)
  const tab = useApp((s) => s.history.tab) ?? 'head-to-head'
  const setHistory = useApp((s) => s.setHistory)
  const standings = useStandings(tab !== 'head-to-head' && !!history.data)
  const theme = useThemeName()

  if (history.error) {
    return <ErrorState title="History unavailable" error={history.error} />
  }
  if (!history.data || !pair || !targets) {
    return (
      <div className="grid gap-4 @min-[1100px]:grid-cols-2" aria-busy aria-label="Loading history">
        <Skeleton className="h-[560px] rounded-xl" />
        <Skeleton className="h-[560px] rounded-xl" />
      </div>
    )
  }
  // Head-to-head colours: each driver's signature team, kept apart when they clash.
  const teamName = (d: number) => {
    const t = signatureTeam(history.data!, d)
    return t == null ? undefined : history.data!.index.constructors[t]?.name
  }
  const colors = duelColors(teamName(pair.a), teamName(pair.b), theme)
  const duelStyle = { '--driver-a': colors.a, '--driver-b': colors.b } as React.CSSProperties
  const source = history.data.index.source
  return (
    <m.div className="grid gap-4" style={duelStyle} {...enter}>
      <Tabs
        value={tab}
        onValueChange={(v) => setHistory({ tab: v as HistoryTab })}
        className="min-w-0 gap-4"
      >
        <ScrollTabsList aria-label="History sections">
          <TabsTrigger value="head-to-head">
            <HelmetIcon /> Head to head
          </TabsTrigger>
          <TabsTrigger value="drivers">
            <DriverIcon /> Drivers
          </TabsTrigger>
          <TabsTrigger value="teams">
            <StrategyIcon /> Teams
          </TabsTrigger>
        </ScrollTabsList>
        <TabsContent value="head-to-head" className="grid min-w-0 gap-4">
          <HeadToHeadCard data={history.data} a={pair.a} b={pair.b} />
        </TabsContent>
        <TabsContent value="drivers" className="min-w-0">
          <DriverProfileView
            data={history.data}
            standings={standings.data}
            driver={targets.driver}
          />
        </TabsContent>
        <TabsContent value="teams" className="min-w-0">
          <TeamProfileView data={history.data} standings={standings.data} team={targets.team} />
        </TabsContent>
      </Tabs>
      <p className="text-[11px] text-faint-foreground">
        Source: {source.name} {source.version} ({source.license}), races through{' '}
        {history.data.index.latestSeason}. Head-to-heads count races both drivers started; a
        classified finish beats a retirement. Leaderboards are in the Record Book, seasons in the
        Race Archive and circuit winners on each circuit page.
      </p>
    </m.div>
  )
}
