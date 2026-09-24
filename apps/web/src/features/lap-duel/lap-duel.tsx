'use client'

import { m } from 'motion/react'
import { Skeleton } from '@/components/ui/skeleton'
import { enter } from '@/lib/motion'
import { ErrorState } from '@/components/ui/error-state'
import { DuelControls } from './duel-controls'
import { LapAnatomy } from './lap-anatomy'
import { SectionTable } from './section-table'
import { StatCards } from './stat-cards'
import { TelemetryCharts } from './telemetry-charts'
import { TrackMap } from './track-map'
import { useDuel, useSessionMeta } from './use-duel'

function LoadingState() {
  return (
    <div className="grid gap-4" aria-busy aria-label="Loading lap data">
      <div className="grid grid-cols-2 gap-3 @min-[760px]:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-xl" />
        ))}
      </div>
      <div className="grid items-start gap-4 @min-[1080px]:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[640px] rounded-xl" />
        <div className="grid gap-4">
          <Skeleton className="h-[320px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function LapDuel() {
  const meta = useSessionMeta()
  const { data, isLoading, error } = useDuel()

  if (error) {
    return <ErrorState title="Session data unavailable" error={error} />
  }

  return (
    <div className="grid gap-4">
      {meta.data ? <DuelControls meta={meta.data} /> : <Skeleton className="h-9 w-full max-w-xl" />}
      {isLoading || !data ? (
        <LoadingState />
      ) : (
        <m.div className="grid gap-4" {...enter}>
          <StatCards data={data} />
          {/* Named areas so the cards line up at every width. Wide: charts beside the
              mini-sectors and corner table (about the same height), lap anatomy full width
              below. Medium: mini-sectors and anatomy side by side at equal height. */}
          <div className="grid gap-4 [grid-template-areas:'charts'_'map'_'anatomy'_'table'] @min-[640px]:grid-cols-2 @min-[640px]:[grid-template-areas:'charts_charts'_'map_anatomy'_'table_table'] @min-[1080px]:grid-cols-[minmax(0,1fr)_360px] @min-[1080px]:[grid-template-areas:'charts_map'_'charts_table'_'anatomy_anatomy']">
            <div className="min-w-0 [grid-area:charts]">
              <TelemetryCharts data={data} />
            </div>
            <div className="min-w-0 [grid-area:map]">
              <TrackMap data={data} />
            </div>
            <div className="min-w-0 [grid-area:anatomy]">
              <LapAnatomy data={data} />
            </div>
            <div className="min-w-0 [grid-area:table]">
              <SectionTable data={data} />
            </div>
          </div>
        </m.div>
      )}
    </div>
  )
}
