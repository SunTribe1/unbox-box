'use client'

import type { SessionMeta } from '@unbox-box/tools'
import { useQuery } from '@tanstack/react-query'
import { HelpText } from '@/components/help-text'
import { indexQuery } from '@/lib/data'

/** Says so when a session's map outline was borrowed because its own GPS was unusable. */
export function DataQualityNote({ meta, className }: { meta: SessionMeta; className?: string }) {
  const index = useQuery(indexQuery())
  if (meta.quality?.outline !== 'borrowed') return null
  const source = index.data?.sessions.find((s) => s.id === meta.quality!.from)
  const from = source ? `${source.season} ${source.event} ${source.session}` : meta.quality.from
  return (
    <HelpText tone="warning" className={className}>
      This session&apos;s GPS was too sparse to draw the circuit, so the map uses the outline from{' '}
      {from}. Car order, gaps and lap times are unaffected.
    </HelpText>
  )
}
