import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  catalogQuery,
  circuitShapesQuery,
  historyQuery,
  metaQuery,
  recordsQuery,
  replayQuery,
  seasonArchiveQuery,
  standingsQuery,
  telemetryQuery,
} from '../src/lib/data'

const DATA = join(__dirname, '../public/data')

/** Serves the bundled demo archive in place of the network. */
function serveFixtures() {
  const fetcher = vi.fn(async (url: string) => {
    const path = url.replace(/^.*?\/data\//, '').replace(/^\//, '')
    try {
      return new Response(readFileSync(join(DATA, path), 'utf8'), { status: 200 })
    } catch {
      return new Response('', { status: 404 })
    }
  })
  vi.stubGlobal('fetch', fetcher)
  return fetcher
}

const load = <T>(q: { queryFn?: unknown }) => (q.queryFn as () => Promise<T>)()

describe('data queries', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads and validates every archive file', async () => {
    serveFixtures()
    const history = await load<{ index: { latestSeason: number } }>(historyQuery())
    expect(history.index.latestSeason).toBeGreaterThanOrEqual(2025)
    await expect(load(standingsQuery())).resolves.toBeTruthy()
    await expect(load(catalogQuery())).resolves.toHaveProperty('engineMakers')
    await expect(load(recordsQuery())).resolves.toHaveProperty('closestFinishes')
    await expect(load(seasonArchiveQuery(1988))).resolves.toHaveProperty('year', 1988)
    await expect(load(circuitShapesQuery())).resolves.toBeTruthy()
  })

  it('loads a session, its replay and a lap of telemetry', async () => {
    const fetcher = serveFixtures()
    const id = '2025-italian-grand-prix-q'
    const meta = await load<{ results: { driver: string; lap: number | null }[] }>(metaQuery(id))
    const pole = meta.results[0]!
    await expect(load(telemetryQuery(id, pole.driver, pole.lap!))).resolves.toHaveProperty('speed')
    await expect(load(replayQuery(id))).rejects.toThrow(/published/)
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining(`/sessions/${id}/meta.json`))
  })

  it('keys each query by what it loads', () => {
    expect(seasonArchiveQuery(1988).queryKey).toEqual(['season-archive', 1988])
    expect(telemetryQuery('s', 'NOR', 3).queryKey).toEqual(['telemetry', 's', 'NOR', 3])
  })
})
