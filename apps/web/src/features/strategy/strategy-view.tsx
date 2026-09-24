'use client'

import { m } from 'motion/react'
import dynamic from 'next/dynamic'
import { HelpText } from '@/components/help-text'
import { Skeleton } from '@/components/ui/skeleton'
import { enter } from '@/lib/motion'
import { ErrorState } from '@/components/ui/error-state'
import { useSessionMeta } from '../lap-duel/use-duel'
import { useReplayData } from '../replay/use-replay'
import { DegradationChart } from './degradation-chart'
import { PitStopsCard } from './pit-stops-card'
import { useStrategyModel } from './shared'
import { Simulator } from './simulator'
import { StintChart } from './stint-chart'
import { UndercutCard } from './undercut-card'

// Recharts only loads with the Strategy Lab, keeping it out of the first page load.
const GapHistory = dynamic(() => import('./gap-history').then((x) => x.GapHistory), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] rounded-xl" />,
})
const LapTimes = dynamic(() => import('./lap-times').then((x) => x.LapTimes), {
  ssr: false,
  loading: () => <Skeleton className="h-[440px] rounded-xl" />,
})
const Positions = dynamic(() => import('./positions').then((x) => x.Positions), {
  ssr: false,
  loading: () => <Skeleton className="h-[440px] rounded-xl" />,
})

function Ready({
  meta,
  replay,
}: {
  meta: NonNullable<ReturnType<typeof useSessionMeta>['data']>
  replay: NonNullable<ReturnType<typeof useReplayData>['data']>
}) {
  const model = useStrategyModel(meta, replay)
  return (
    <m.div className="grid gap-4" {...enter}>
      <div className="grid gap-4 @min-[1100px]:grid-cols-2">
        <Simulator meta={meta} replay={replay} model={model} />
        <UndercutCard meta={meta} replay={replay} model={model} />
      </div>
      <div className="grid gap-4 @min-[1100px]:grid-cols-2">
        <LapTimes meta={meta} replay={replay} />
        <Positions meta={meta} replay={replay} />
      </div>
      <div className="grid gap-4 @min-[1100px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <GapHistory meta={meta} replay={replay} />
        <PitStopsCard meta={meta} replay={replay} />
      </div>
      <div className="grid gap-4 @min-[1100px]:grid-cols-2">
        <StintChart meta={meta} replay={replay} />
        <DegradationChart meta={meta} replay={replay} model={model} />
      </div>
      <HelpText>
        Estimates from a tyre model fitted on this race&apos;s {meta.event} laps: lap time =
        compound pace + degradation × tyre age + fuel effect × lap + driver pace. It ignores
        traffic, safety cars and tyre warm-up, so treat results as a guide, not a verdict.
      </HelpText>
    </m.div>
  )
}

export function StrategyView() {
  const meta = useSessionMeta()
  const replay = useReplayData()
  const error = meta.error ?? replay.error
  if (error) {
    return <ErrorState title="Strategy data unavailable" error={error} />
  }
  if (!meta.data || !replay.data) {
    return (
      <div className="grid gap-4 @min-[1100px]:grid-cols-2" aria-busy aria-label="Loading strategy">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[320px] rounded-xl" />
        ))}
      </div>
    )
  }
  return <Ready meta={meta.data} replay={replay.data} />
}
