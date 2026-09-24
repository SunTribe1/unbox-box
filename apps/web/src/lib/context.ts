import type { UnboxBoxContext } from '@unbox-box/tools'
import {
  historyQuery,
  standingsQuery,
  indexQuery,
  metaQuery,
  queryClient,
  replayQuery,
  telemetryQuery,
} from './data'
import { useApp, usePlayback } from './store'

/** The browser implementation of UnboxBoxContext: tools read through the shared query cache
 *  and act through store actions — the same actions the buttons call. */
export const browserContext: UnboxBoxContext = {
  async listSessions() {
    return (await queryClient.fetchQuery(indexQuery())).sessions
  },
  async getSession(id) {
    const sessionId = id ?? useApp.getState().sessionId
    if (!sessionId) throw new Error('No session is loaded yet.')
    return queryClient.fetchQuery(metaQuery(sessionId))
  },
  getTelemetry(sessionId, driver, lap) {
    return queryClient.fetchQuery(telemetryQuery(sessionId, driver, lap))
  },
  getReplay(sessionId) {
    return queryClient.fetchQuery(replayQuery(sessionId))
  },
  getHistory() {
    return queryClient.fetchQuery(historyQuery())
  },
  getStandings() {
    return queryClient.fetchQuery(standingsQuery())
  },
  getState() {
    const s = useApp.getState()
    const p = usePlayback.getState()
    if (!s.sessionId || !s.duel) throw new Error('The session is still loading.')
    return {
      sessionId: s.sessionId,
      view: s.view,
      duel: s.duel,
      corner: s.corner,
      traces: s.traces,
      playback: { time: p.time, playing: p.playing, speed: p.speed },
    }
  },
  commands: {
    async loadSession(id) {
      const meta = await queryClient.fetchQuery(metaQuery(id))
      useApp.getState().setSession(id)
      // Tools that switch sessions expect a usable duel right away.
      const [p1, p2] = meta.results
      if (p1?.lap && p2?.lap) {
        useApp.getState().setDuel({ a: p1.driver, b: p2.driver, lapA: p1.lap, lapB: p2.lap })
      }
    },
    openView: (view) => useApp.getState().setView(view),
    setDuel: (duel) => useApp.getState().setDuel(duel),
    highlightCorner: (corner) => useApp.getState().setCorner(corner),
    setTraces: (traces) => useApp.getState().setTraces(traces),
    seekReplay: (time) => usePlayback.getState().seek(time),
    setPlayback: (update) => usePlayback.getState().set(update),
    setStrategy: (update) => useApp.getState().setStrategy(update),
    setHistory: (update) => useApp.getState().setHistory(update),
    setArchive: (update) => useApp.getState().setArchive(update),
    setCircuit: (circuit) => useApp.getState().setCircuit(circuit),
  },
}
