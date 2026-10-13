import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HistoryIndexSchema, HistoryResultsSchema, SessionIndexSchema } from '@unbox-box/tools'
import type { SeoSource } from './pages'
import { SeoReplaySchema, SeoSessionMetaSchema, type SeoSessionDetail } from './session-source'

/** Build time only. Reads the data that scripts/seo-data.mjs fetched before the build, or the
 *  copy bundled with the site when there is none (local builds without the full dataset). */

const FETCHED = join(process.cwd(), '.seo-data')
const BUNDLED = join(process.cwd(), 'public/data')

const fetched = () => existsSync(join(FETCHED, 'index.json'))

function find(file: string): string | null {
  const dir = fetched() ? FETCHED : BUNDLED
  const path = join(dir, file)
  return existsSync(path) ? path : null
}

function read(file: string): unknown {
  const path = find(file)
  if (!path) throw new Error(`[seo] missing ${file}`)
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** A session's facts, or undefined when its files weren't fetched (the page then keeps its
 *  title, description and links, without the summary tables). */
function sessionDetail(id: string, session: string): SeoSessionDetail | undefined {
  const metaPath = find(`sessions/${id}/meta.json`)
  if (!metaPath) return undefined
  const meta = SeoSessionMetaSchema.parse(JSON.parse(readFileSync(metaPath, 'utf8')))
  const replayPath = session === 'Race' ? find(`sessions/${id}/replay.json`) : null
  const replay = replayPath
    ? SeoReplaySchema.parse(JSON.parse(readFileSync(replayPath, 'utf8')))
    : undefined
  return { meta, ...(replay && { replay }) }
}

let cached: SeoSource | undefined

export function loadSeoSource(): SeoSource {
  if (cached) return cached
  const { sessions } = SessionIndexSchema.parse(read('index.json'))
  const details = new Map<string, SeoSessionDetail>()
  for (const s of sessions) {
    const detail = sessionDetail(s.id, s.session)
    if (detail) details.set(s.id, detail)
  }
  cached = {
    sessions,
    history: HistoryIndexSchema.parse(read('history/index.json')),
    results: HistoryResultsSchema.parse(read('history/results.json')),
    details,
  }
  return cached
}
