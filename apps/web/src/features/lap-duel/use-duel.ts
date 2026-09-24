'use client'

import type { Lap, SessionMeta, Telemetry } from '@unbox-box/tools'
import { useQuery } from '@tanstack/react-query'
import { metaQuery, telemetryQuery } from '@/lib/data'
import { useApp } from '@/lib/store'

export interface DuelData {
  meta: SessionMeta
  telA: Telemetry
  telB: Telemetry
  lapA: Lap
  lapB: Lap
}

export function useSessionMeta() {
  const sessionId = useApp((s) => s.sessionId)
  return useQuery({ ...metaQuery(sessionId ?? ''), enabled: !!sessionId })
}

export function useDuel(): { data?: DuelData; isLoading: boolean; error: Error | null } {
  const sessionId = useApp((s) => s.sessionId) ?? ''
  const duel = useApp((s) => s.duel)
  const meta = useSessionMeta()
  const telA = useQuery({
    ...telemetryQuery(sessionId, duel?.a ?? '', duel?.lapA ?? 0),
    enabled: !!duel && !!sessionId,
  })
  const telB = useQuery({
    ...telemetryQuery(sessionId, duel?.b ?? '', duel?.lapB ?? 0),
    enabled: !!duel && !!sessionId,
  })
  const error = meta.error ?? telA.error ?? telB.error
  if (!meta.data || !telA.data || !telB.data || !duel) {
    return { isLoading: !error, error }
  }
  const lapA = meta.data.laps[duel.a]?.find((l) => l.lap === duel.lapA)
  const lapB = meta.data.laps[duel.b]?.find((l) => l.lap === duel.lapB)
  if (!lapA || !lapB)
    return { isLoading: false, error: new Error('Lap not found in this session.') }
  return {
    data: { meta: meta.data, telA: telA.data, telB: telB.data, lapA, lapB },
    isLoading: false,
    error: null,
  }
}
