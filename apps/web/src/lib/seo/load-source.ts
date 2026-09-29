import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HistoryIndexSchema, HistoryResultsSchema, SessionIndexSchema } from '@unbox-box/tools'
import type { SeoSource } from './pages'

/** Build time only. Reads the data that scripts/seo-data.mjs fetched before the build, or the
 *  copy bundled with the site when there is none (local builds without the full dataset). */

const FETCHED = join(process.cwd(), '.seo-data')
const BUNDLED = join(process.cwd(), 'public/data')

function read(file: string): unknown {
  const dir = existsSync(join(FETCHED, file)) ? FETCHED : BUNDLED
  return JSON.parse(readFileSync(join(dir, file), 'utf8'))
}

let cached: SeoSource | undefined

export function loadSeoSource(): SeoSource {
  cached ??= {
    sessions: SessionIndexSchema.parse(read('index.json')).sessions,
    history: HistoryIndexSchema.parse(read('history/index.json')),
    results: HistoryResultsSchema.parse(read('history/results.json')),
  }
  return cached
}
