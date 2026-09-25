# ADR 0004: Multi-season data on a Hugging Face dataset

**Status:** accepted · 2026-09-23

## Context

Unbox Box grew from one Grand Prix to every qualifying, race, sprint and sprint qualifying
session from 2023 onward, about 340 sessions and 600 MB of JSON. That is too big to bundle
into the static export or keep in the app repo, and new sessions arrive every race weekend.
The budget is still $0.

## Decision

- `unbox-box-pipeline sync` builds every session TracingInsights has published that isn't
  built yet, then rebuilds `index.json` from the session folders.
- The archive lives in a public Hugging Face dataset. The app reads it through
  `NEXT_PUBLIC_DATA_BASE`; its `resolve/main` URLs are CORS-enabled and CDN-backed.
- A scheduled GitHub Action runs the sync every three hours on race weekends (Friday to
  Monday, UTC) and once a day midweek. It reads the live `index.json`
  first, so a fresh runner only builds what's new.
- The bundled Monza 2025 files stay in `apps/web/public/data` as the offline demo and the
  test fixture.

Alternatives considered: GitHub Pages in a separate data repo (1 GB cap, close to our size
with older seasons); Cloudflare R2 (may ask for a card); the app repo (every deploy grows by
hundreds of MB).

## Consequences

- The app deploy stays small, and data updates never need an app deploy.
- Hugging Face becomes a runtime dependency. If it's down, the app still has the bundled
  demo session.
- Session ids are stable (`2024-sao-paulo-grand-prix-sq`), so deep links survive rebuilds.
