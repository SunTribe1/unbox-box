'use client'

import { resolveHistoricDriver, type HistoryData, type SessionMeta } from '@unbox-box/tools'
import { useQuery } from '@tanstack/react-query'
import { historyQuery, standingsQuery } from '@/lib/data'
import { useApp } from '@/lib/store'

export function useHistoryData() {
  return useQuery(historyQuery())
}

/** Round-by-round standings: only fetched once a profile or season needs them. */
export function useStandings(enabled: boolean) {
  return useQuery({ ...standingsQuery(), enabled })
}

/** The driver and team the profile tabs show: from state, else the loaded session's winner
 *  and their latest team. */
export function useProfileTargets(data: HistoryData | undefined, meta: SessionMeta | undefined) {
  const history = useApp((s) => s.history)
  if (!data) return null
  let driver = history.driver ? data.index.drivers.findIndex((d) => d.id === history.driver) : -1
  if (driver < 0) {
    try {
      driver = resolveHistoricDriver(data, meta?.results[0]?.driver ?? 'Verstappen')
    } catch {
      driver = resolveHistoricDriver(data, 'Verstappen')
    }
  }
  let team = history.team ? data.index.constructors.findIndex((c) => c.id === history.team) : -1
  if (team < 0) {
    const r = data.results
    for (let row = r.race.length - 1; row >= 0; row--) {
      if (r.driver[row] === driver) {
        team = r.constructor[row]!
        break
      }
    }
  }
  return { driver, team: Math.max(team, 0) }
}

/** Driver indexes for the head-to-head: from state, else the session's top two. */
export function useHeadToHeadPair(data: HistoryData | undefined, meta: SessionMeta | undefined) {
  const history = useApp((s) => s.history)
  if (!data) return null
  const byId = (id?: string) => (id ? data.index.drivers.findIndex((d) => d.id === id) : -1)
  const fallback = (code: string | undefined, other: string) => {
    try {
      return resolveHistoricDriver(data, code ?? other)
    } catch {
      return resolveHistoricDriver(data, other)
    }
  }
  const a = byId(history.a)
  const b = byId(history.b)
  return {
    a: a >= 0 ? a : fallback(meta?.results[0]?.driver, 'Hamilton'),
    b: b >= 0 ? b : fallback(meta?.results[1]?.driver, 'Verstappen'),
  }
}
