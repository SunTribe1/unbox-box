import { afterEach, describe, expect, it, vi } from 'vitest'
import { indexQuery } from '../src/lib/data'

const run = () => (indexQuery().queryFn as () => Promise<unknown>)()

describe('data loading', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('explains a missing file as not published yet', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 })),
    )
    await expect(run()).rejects.toThrow(/hasn’t been published yet/)
  })

  it('explains a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('offline'))),
    )
    await expect(run()).rejects.toThrow(/Couldn’t reach the data server/)
  })

  it('rejects files that don’t match the schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ schemaVersion: 99 })),
    )
    await expect(run()).rejects.toThrow()
  })

  it('reports server errors with their status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 })),
    )
    await expect(run()).rejects.toThrow(/503/)
  })
})
