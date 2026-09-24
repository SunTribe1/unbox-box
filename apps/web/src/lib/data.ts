import {
  type Catalog,
  CatalogSchema,
  type Records,
  RecordsSchema,
  type SeasonArchive,
  SeasonArchiveSchema,
  type CircuitShapes,
  CircuitShapesSchema,
  type HistoryData,
  HistoryIndexSchema,
  HistoryResultsSchema,
  type HistoryStandings,
  HistoryStandingsSchema,
  type Replay,
  ReplaySchema,
  type SessionIndex,
  SessionIndexSchema,
  type SessionMeta,
  SessionMetaSchema,
  type Telemetry,
  TelemetrySchema,
} from '@unbox-box/tools'
import { QueryClient, queryOptions } from '@tanstack/react-query'
import type { z } from 'zod'

/** All data is static JSON built by the pipeline. One query client is shared by React
 *  components and by tools (via fetchQuery), so both read from the same cache. */

const DATA_BASE = process.env.NEXT_PUBLIC_DATA_BASE ?? '/data'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: Infinity, gcTime: 30 * 60_000, retry: 1, refetchOnWindowFocus: false },
  },
})

async function fetchJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${DATA_BASE}${path}`)
  } catch {
    throw new Error('Couldn’t reach the data server. Check your connection and try again.')
  }
  if (response.status === 404) {
    throw new Error(
      'This data hasn’t been published yet. New sessions appear a few hours after they end.',
    )
  }
  if (!response.ok) throw new Error(`The data server returned an error (${response.status}).`)
  return schema.parse(await response.json())
}

export const indexQuery = () =>
  queryOptions<SessionIndex>({
    queryKey: ['index'],
    queryFn: () => fetchJson('/index.json', SessionIndexSchema),
  })

export const metaQuery = (sessionId: string) =>
  queryOptions<SessionMeta>({
    queryKey: ['meta', sessionId],
    queryFn: () => fetchJson(`/sessions/${sessionId}/meta.json`, SessionMetaSchema),
  })

export const telemetryQuery = (sessionId: string, driver: string, lap: number) =>
  queryOptions<Telemetry>({
    queryKey: ['telemetry', sessionId, driver, lap],
    queryFn: () => fetchJson(`/sessions/${sessionId}/tel/${driver}-${lap}.json`, TelemetrySchema),
  })

export const replayQuery = (sessionId: string) =>
  queryOptions<Replay>({
    queryKey: ['replay', sessionId],
    queryFn: () => fetchJson(`/sessions/${sessionId}/replay.json`, ReplaySchema),
  })

/** One small outline per circuit for the Circuits pages (a few KB). */
export const circuitShapesQuery = () =>
  queryOptions<CircuitShapes>({
    queryKey: ['circuit-shapes'],
    queryFn: () => fetchJson('/circuits.json', CircuitShapesSchema),
    staleTime: Infinity,
  })

/** Official standings after every round since 1950, loaded only for the Seasons tab. */
export const standingsQuery = () =>
  queryOptions<HistoryStandings>({
    queryKey: ['history-standings'],
    queryFn: () => fetchJson('/history/standings.json', HistoryStandingsSchema),
    staleTime: Infinity,
  })

/** All-time data (about 130 KB compressed), loaded only when history is needed. */
export const historyQuery = () =>
  queryOptions<HistoryData>({
    queryKey: ['history'],
    queryFn: async () => {
      const [index, results] = await Promise.all([
        fetchJson('/history/index.json', HistoryIndexSchema),
        fetchJson('/history/results.json', HistoryResultsSchema),
      ])
      return { index, results }
    },
  })

/** Engines, tyres, team cars by season, driver families and countries (about 30 KB). */
export const catalogQuery = () =>
  queryOptions<Catalog>({
    queryKey: ['history-catalog'],
    queryFn: () => fetchJson('/history/catalog.json', CatalogSchema),
    staleTime: Infinity,
  })

/** Record books that come from the big session tables (a few KB). */
export const recordsQuery = () =>
  queryOptions<Records>({
    queryKey: ['history-records'],
    queryFn: () => fetchJson('/history/records.json', RecordsSchema),
    staleTime: Infinity,
  })

/** One season: every session of every weekend, the entry list and season stats. */
export const seasonArchiveQuery = (year: number) =>
  queryOptions<SeasonArchive>({
    queryKey: ['season-archive', year],
    queryFn: () => fetchJson(`/history/seasons/${year}.json`, SeasonArchiveSchema),
    staleTime: Infinity,
  })
