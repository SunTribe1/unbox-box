'use client'

import { findResult } from '@unbox-box/tools'
import type { DuelSelection, SessionMeta } from '@unbox-box/tools'
import { useEffect } from 'react'
import { indexQuery, metaQuery, queryClient } from './data'
import { useApp, usePlayback } from './store'
import { readUrl, startUrlSync, type UrlState } from './url-sync'

function defaultDuel(meta: SessionMeta): DuelSelection {
  const [p1, p2] = meta.results
  if (!p1?.lap || !p2?.lap) throw new Error('Session has fewer than two classified laps.')
  return { a: p1.driver, b: p2.driver, lapA: p1.lap, lapB: p2.lap }
}

function hasTelemetry(meta: SessionMeta, driver?: string, lap?: number) {
  return !!driver && !!lap && !!meta.laps[driver]?.some((l) => l.lap === lap && l.telemetry)
}

function duelFromUrl(meta: SessionMeta, url: UrlState): DuelSelection | null {
  const d = url.duel
  if (!d) return null
  const best = (code?: string) => (code ? findResult(meta, code)?.lap : undefined) ?? undefined
  const lapA = d.lapA ?? best(d.a)
  const lapB = d.lapB ?? best(d.b)
  if (!hasTelemetry(meta, d.a, lapA) || !hasTelemetry(meta, d.b, lapB)) return null
  return { a: d.a!, b: d.b!, lapA: lapA!, lapB: lapB! }
}

/** Loads the index and the first session, restores state from the URL, then keeps the URL
 *  in sync. Also fills in a default duel whenever a new session is loaded. */
export function useBootstrap() {
  useEffect(() => {
    let cancelled = false
    let stopSync = () => {}
    const app = useApp.getState()
    const url = readUrl()

    async function init() {
      const index = await queryClient.fetchQuery(indexQuery())
      const sessionId =
        index.sessions.find((s) => s.id === url.sessionId)?.id ?? index.sessions[0]?.id
      if (!sessionId || cancelled) return
      const meta = await queryClient.fetchQuery(metaQuery(sessionId))
      if (cancelled) return
      app.setSession(sessionId)
      // Lap Duel is the front page for every session; links can name another view.
      const view = url.view ?? 'lap-duel'
      const raceOnly = view === 'replay' || view === 'strategy'
      app.setView(raceOnly && !meta.replay ? 'lap-duel' : view)
      if (url.replayTime) usePlayback.getState().seek(url.replayTime)
      if (url.traces) app.setTraces(url.traces)
      if (url.follow) usePlayback.getState().setFocus(url.follow)
      if (url.circuit) app.setCircuit(url.circuit)
      if (url.archive && Object.keys(url.archive).length) app.setArchive(url.archive)
      if (url.history) {
        const h = Object.fromEntries(Object.entries(url.history).filter(([, v]) => v != null))
        if (Object.keys(h).length) app.setHistory(h)
      }
      app.setDuel(duelFromUrl(meta, url) ?? defaultDuel(meta))
      if (url.corner && meta.circuit.corners.some((c) => c.number === url.corner)) {
        app.setCorner(url.corner)
      }
      stopSync = startUrlSync()
    }

    const stopDefaults = useApp.subscribe(
      (s) => [s.sessionId, s.duel] as const,
      async ([sessionId, duel]) => {
        if (!sessionId || duel) return
        const meta = await queryClient.fetchQuery(metaQuery(sessionId))
        const state = useApp.getState()
        if (!state.duel) state.setDuel(defaultDuel(meta))
        if ((state.view === 'replay' || state.view === 'strategy') && !meta.replay) {
          state.setView('lap-duel')
        }
      },
    )

    init().catch((error) => console.error('[unbox-box] bootstrap failed', error))
    return () => {
      cancelled = true
      stopSync()
      stopDefaults()
    }
  }, [])
}
