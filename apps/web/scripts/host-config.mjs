// Writes each host's config from one policy: security headers (scripts/security-policy.mjs)
// and deep-link rewrites (scripts/host-routes.mjs).
//   vercel.json                          Vercel
//   public/_headers, public/_redirects   Netlify, Cloudflare Pages
//   public/serve.json                    `serve` (local preview and the Playwright suite)
// Runs before every build (`prebuild`), so the data host in NEXT_PUBLIC_DATA_BASE is allowed.
import { writeFileSync } from 'node:fs'
import { redirectsFile, serveRewrites, vercelRewrites } from './host-routes.mjs'
import { originOf, securityHeaders } from './security-policy.mjs'

const { production, local } = securityHeaders(process.env.NEXT_PUBLIC_DATA_BASE)
const pairs = (h) => Object.entries(h).map(([key, value]) => ({ key, value }))
const here = (p) => new URL(`../${p}`, import.meta.url)
const json = (v) => `${JSON.stringify(v, null, 2)}\n`

writeFileSync(
  here('vercel.json'),
  json({
    $schema: 'https://openapi.vercel.sh/vercel.json',
    // Serve the export as plain static files. Under the Next.js preset Vercel applies its own
    // Next.js routing and ignores these rewrites for a static export (ADR 0008).
    framework: null,
    buildCommand: 'npm run build',
    outputDirectory: 'out',
    trailingSlash: true,
    rewrites: vercelRewrites(),
    headers: [{ source: '/(.*)', headers: pairs(production) }],
  }),
)
writeFileSync(
  here('public/_headers'),
  `/*\n${Object.entries(production)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n')}\n`,
)
writeFileSync(here('public/_redirects'), redirectsFile())
writeFileSync(
  here('public/serve.json'),
  json({ rewrites: serveRewrites(), headers: [{ source: '**/*', headers: pairs(local) }] }),
)
console.log(
  `host config written (data host: ${originOf(process.env.NEXT_PUBLIC_DATA_BASE) ?? 'same origin'})`,
)
