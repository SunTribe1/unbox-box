// Deep links as data, with no side effects (unit-tested in test/host-routes.test.ts).
//
// The static export has one page per view (/duel/index.html, /races/index.html, …). What a
// page shows lives in the path after it (/races/1988/3/qualifying/), so every host rewrites
// those paths to the view's page, and the app reads the rest of the path on load. Real files
// (/duel/__next._tree.txt, /_next/static/…) are always served first.

/** Must match VIEW_SLUG in src/lib/routes.ts (the test checks). */
export const VIEW_SLUGS = [
  'duel',
  'replay',
  'strategy',
  'history',
  'circuits',
  'races',
  'records',
  'engines',
  'nations',
  'help',
]

/** vercel.json `rewrites`. Vercel serves each prerendered page at its route without the
 *  trailing slash (x-matched-path: /duel); /duel/ and /duel/index.html both miss it after a
 *  rewrite and fall through to the 404 page. */
export const vercelRewrites = () =>
  VIEW_SLUGS.map((s) => ({ source: `/${s}/:path+`, destination: `/${s}` }))

/** public/_redirects (Netlify, Cloudflare Pages): status 200 is a rewrite, not a redirect. */
export const redirectsFile = () =>
  `${VIEW_SLUGS.map((s) => `/${s}/*  /${s}/index.html  200`).join('\n')}\n`

/** public/serve.json `rewrites` (local preview and the Playwright suite). */
export const serveRewrites = () =>
  VIEW_SLUGS.map((s) => ({ source: `/${s}/**`, destination: `/${s}/index.html` }))
