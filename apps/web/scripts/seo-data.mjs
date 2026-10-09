// Fetches the data the build turns into one page per race, driver, team, circuit and session
// (src/lib/seo). Runs before every build (`prebuild`) into .seo-data/ (git-ignored).
//
// NEXT_PUBLIC_DATA_BASE unset or a local path: nothing to fetch, the build uses the bundled
// copy in public/data. A failed fetch fails a Vercel build, so a network blip can never ship
// a site with thousands of pages missing; the live deployment stays up. Elsewhere it warns
// and falls back to the bundled copy.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { slimMeta, slimReplay } from './seo-slim.mjs'

const FILES = ['index.json', 'history/index.json', 'history/results.json']
const OUT = new URL('../.seo-data/', import.meta.url)
// Session files are fetched a few at a time: fast, without hammering the host.
const CONCURRENCY = 8
const RETRIES = 3

const base = process.env.NEXT_PUBLIC_DATA_BASE?.trim().replace(/\/+$/, '')
rmSync(OUT, { recursive: true, force: true })

async function fetchJson(file) {
  let lastError
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(`${base}/${file}`, { signal: AbortSignal.timeout(60_000) })
      if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
      return await res.json() // fail here, not halfway through the build
    } catch (err) {
      lastError = err
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
    }
  }
  throw lastError
}

function write(file, data) {
  const out = new URL(file, OUT)
  mkdirSync(dirname(out.pathname), { recursive: true })
  writeFileSync(out, JSON.stringify(data))
}

/** Per-session facts for the session pages: the meta and replay files minus the large
 *  telemetry, lap and position arrays the pages never show. */
async function fetchSessions(sessions) {
  const queue = [...sessions]
  const worker = async () => {
    for (let s = queue.shift(); s; s = queue.shift()) {
      const dir = `sessions/${s.id}`
      write(`${dir}/meta.json`, slimMeta(await fetchJson(`${dir}/meta.json`)))
      if (s.session === 'Race') {
        write(`${dir}/replay.json`, slimReplay(await fetchJson(`${dir}/replay.json`)))
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}

if (!base || !/^https?:\/\//.test(base)) {
  console.log('[seo-data] no remote data base; using the bundled data in public/data')
} else {
  try {
    for (const file of FILES) write(file, await fetchJson(file))
    const { sessions } = await fetchJson('index.json')
    await fetchSessions(sessions)
    console.log(`[seo-data] fetched ${FILES.length} files and ${sessions.length} sessions`)
  } catch (err) {
    rmSync(OUT, { recursive: true, force: true })
    const message = `[seo-data] could not fetch the data from ${base}: ${err.message}`
    if (process.env.VERCEL) {
      console.error(message)
      process.exit(1)
    }
    console.warn(`${message}; using the bundled data in public/data`)
  }
}
