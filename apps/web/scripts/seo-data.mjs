// Fetches the data the build turns into one page per race, driver, team, circuit and session
// (src/lib/seo). Runs before every build (`prebuild`) into .seo-data/ (git-ignored).
//
// NEXT_PUBLIC_DATA_BASE unset or a local path: nothing to fetch, the build uses the bundled
// copy in public/data. A failed fetch fails a Vercel build, so a network blip can never ship
// a site with thousands of pages missing; the live deployment stays up. Elsewhere it warns
// and falls back to the bundled copy.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const FILES = ['index.json', 'history/index.json', 'history/results.json']
const OUT = new URL('../.seo-data/', import.meta.url)

const base = process.env.NEXT_PUBLIC_DATA_BASE?.trim().replace(/\/+$/, '')
rmSync(OUT, { recursive: true, force: true })

if (!base || !/^https?:\/\//.test(base)) {
  console.log('[seo-data] no remote data base; using the bundled data in public/data')
} else {
  try {
    for (const file of FILES) {
      const res = await fetch(`${base}/${file}`, { signal: AbortSignal.timeout(60_000) })
      if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`)
      const body = await res.text()
      JSON.parse(body) // fail here, not halfway through the build
      const out = new URL(file, OUT)
      mkdirSync(dirname(out.pathname), { recursive: true })
      writeFileSync(out, body)
    }
    console.log(`[seo-data] fetched ${FILES.length} files from ${base}`)
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
