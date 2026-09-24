// Writes the site's security headers for every host we deploy to, from one policy
// (scripts/security-policy.mjs):
//   vercel.json          Vercel
//   public/_headers      Netlify, Cloudflare Pages
//   public/serve.json    `serve` (local preview and the Playwright suite, so tests run under it)
// Runs before every build (`prebuild`), so the data host in NEXT_PUBLIC_DATA_BASE is allowed.
import { writeFileSync } from 'node:fs'
import { originOf, securityHeaders } from './security-policy.mjs'

const { production, local } = securityHeaders(process.env.NEXT_PUBLIC_DATA_BASE)
const pairs = (h) => Object.entries(h).map(([key, value]) => ({ key, value }))
const here = (p) => new URL(`../${p}`, import.meta.url)

writeFileSync(
  here('vercel.json'),
  `${JSON.stringify({ headers: [{ source: '/(.*)', headers: pairs(production) }] }, null, 2)}\n`,
)
writeFileSync(
  here('public/_headers'),
  `/*\n${Object.entries(production)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n')}\n`,
)
writeFileSync(
  here('public/serve.json'),
  `${JSON.stringify({ headers: [{ source: '**/*', headers: pairs(local) }] }, null, 2)}\n`,
)
console.log(
  `security headers written (data host: ${originOf(process.env.NEXT_PUBLIC_DATA_BASE) ?? 'same origin'})`,
)
