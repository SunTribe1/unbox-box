import { findDriver, formatInterval, formatLapTime, standingsAt, stintsFor } from '@unbox-box/tools'
import { metaQuery, queryClient, replayQuery, telemetryQuery } from './data'
import { downloadCsv } from './export'
import { useApp, usePlayback } from './store'

/** "Download CSV" for whatever is on screen. Reads from the query cache (fetching if needed),
 *  so it exports exactly the data the view shows. Returns a label for the toast. */
export async function exportCurrentView(): Promise<string> {
  const { view, sessionId, duel } = useApp.getState()
  if (!sessionId) throw new Error('No session loaded yet.')
  const meta = await queryClient.fetchQuery(metaQuery(sessionId))

  if (view === 'lap-duel') {
    if (!duel) throw new Error('Pick two laps first.')
    const [a, b] = await Promise.all([
      queryClient.fetchQuery(telemetryQuery(sessionId, duel.a, duel.lapA)),
      queryClient.fetchQuery(telemetryQuery(sessionId, duel.b, duel.lapB)),
    ])
    const step = meta.telemetry.step
    const channels = ['t', 'speed', 'throttle', 'brake', 'gear', 'rpm'] as const
    const header = [
      'distance_m',
      ...channels.map((c) => `${a.driver}_L${a.lap}_${c}`),
      ...channels.map((c) => `${b.driver}_L${b.lap}_${c}`),
    ]
    const rows = a.t.map((_, i) => [
      Math.round(i * step * 10) / 10,
      ...channels.map((c) => a[c][i]),
      ...channels.map((c) => b[c][i]),
    ])
    downloadCsv(`${sessionId}-${a.driver}${a.lap}-vs-${b.driver}${b.lap}.csv`, header, rows)
    return `${a.driver} vs ${b.driver} telemetry`
  }

  if (view === 'replay' || view === 'strategy') {
    const replay = await queryClient.fetchQuery(replayQuery(sessionId))
    if (view === 'replay') {
      const t = usePlayback.getState().time
      const rows = standingsAt(replay, t).map((s) => [
        s.position,
        s.driver,
        s.lap,
        s.gap ? formatInterval(s.gap) : null,
        s.interval ? formatInterval(s.interval) : null,
        s.state,
        s.compound,
        s.tyreAge,
        s.pitStops,
      ])
      downloadCsv(
        `${sessionId}-order-${Math.round(t)}s.csv`,
        [
          'position',
          'driver',
          'lap',
          'gap',
          'interval',
          'state',
          'compound',
          'tyre_age',
          'pit_stops',
        ],
        rows,
      )
      return 'Running order'
    }
    const rows = meta.results.flatMap((r) =>
      stintsFor(replay, r.driver).map((s, i) => [
        r.position,
        r.driver,
        i + 1,
        s.compound,
        s.from,
        s.to,
        s.to - s.from + 1,
        s.startAge,
      ]),
    )
    downloadCsv(
      `${sessionId}-stints.csv`,
      ['finish', 'driver', 'stint', 'compound', 'from_lap', 'to_lap', 'laps', 'start_age'],
      rows,
    )
    return 'Tyre stints'
  }

  // History and anything else: the session's classification.
  const rows = meta.results.map((r) => [
    r.position,
    r.driver,
    findDriver(meta, r.driver)?.team,
    r.lap,
    r.time != null ? formatLapTime(r.time) : null,
    r.time,
    r.compound,
    r.speedTrap,
  ])
  downloadCsv(
    `${sessionId}-results.csv`,
    ['position', 'driver', 'team', 'lap', 'best', 'best_s', 'compound', 'speed_trap_kmh'],
    rows,
  )
  return 'Session results'
}
