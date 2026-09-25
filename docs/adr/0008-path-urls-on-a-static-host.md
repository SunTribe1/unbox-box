# ADR 0008: Path URLs on a static host

**Status:** accepted · 2026-09-24

## Context

Every page needs a link people can share, bookmark and reload. The site is a static export
with one prerendered page per view (`/duel/`, `/races/`, …), so until now the page's contents
went in the query: `/duel/?s=2026-italian-grand-prix-r&a=ANT-53&b=RUS-51`. That works
everywhere but reads badly, and search engines and link previews treat the query as noise.

Prerendering a page for every session, lap pair and race weekend isn't practical: there are
tens of thousands, and new sessions arrive every weekend.

## Decision

- What a page shows goes in the path; view settings stay in the query:
  `/duel/2026-italian-grand-prix-r/ANT-53-vs-RUS-51/?corner=10`,
  `/races/1988/3/qualifying/`, `/history/drivers/ayrton-senna/`, `/engines/tyres/pirelli/`.
- Each host rewrites `/<view>/*` to the view's page (`/<view>` on Vercel, `/<view>/index.html`
  elsewhere), and the app reads the rest of the path
  on load (`apps/web/src/lib/routes.ts`). Real files always win, so Next.js's own
  `/<view>/__next.*.txt` files and assets are unaffected.
- One script (`apps/web/scripts/host-config.mjs`) writes the rewrites for Vercel
  (`vercel.json`), Netlify and Cloudflare Pages (`_redirects`) and `serve` (`serve.json`, used by
  the Playwright suite), from the list of view slugs in `scripts/host-routes.mjs`. A unit test
  checks that list matches the app's.
- Path segments are validated (letters, digits, dashes) and anything malformed is dropped, so a
  bad link falls back to the view's index page.
- Older links keep working: the query is still read, and the app rewrites the address to the
  new form.
- The service worker caches each view's page once, under its root, so any deep link opens
  offline once the view has been visited.

## Consequences

- A host without rewrites serves only the view roots and query links; `docs/deploy.md` says so.
- Archive pages no longer carry the telemetry session in their links, so reloading one starts
  from the latest session when you switch back to Lap Duel.
- Adding a view means adding its slug in two places; the test catches a miss.
