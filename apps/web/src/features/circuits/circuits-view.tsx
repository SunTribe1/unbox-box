'use client'

import { useQuery } from '@tanstack/react-query'
import { LayoutGroup } from 'motion/react'
import { ErrorState } from '@/components/ui/error-state'
import { Skeleton } from '@/components/ui/skeleton'
import { circuitShapesQuery, indexQuery } from '@/lib/data'
import { useApp } from '@/lib/store'
import { useHistoryData } from '../history/use-history'
import { CircuitIndex } from './circuit-index'
import { CircuitPage } from './circuit-page'

/** Circuits: a grid of every venue, and a page per circuit. A card's outline glides into
 *  the page's hero map (shared layout animation) when a circuit opens. */
export function CircuitsView() {
  const history = useHistoryData()
  const shapes = useQuery(circuitShapesQuery())
  const index = useQuery(indexQuery())
  const circuit = useApp((s) => s.circuit)

  if (history.error) return <ErrorState title="Circuits unavailable" error={history.error} />
  if (!history.data) {
    return (
      <div className="grid gap-3 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-3" aria-busy>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    )
  }
  return (
    <LayoutGroup>
      {circuit ? (
        <CircuitPage
          data={history.data}
          shapes={shapes.data}
          sessions={index.data?.sessions ?? []}
          circuitId={circuit}
        />
      ) : (
        <CircuitIndex data={history.data} shapes={shapes.data} />
      )}
    </LayoutGroup>
  )
}
