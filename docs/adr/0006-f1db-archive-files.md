# ADR 0006: The F1DB archive as per-season files

**Status:** accepted · 2026-09-24

## Context

The Race Archive, Record Book, Engines & Tyres and Nations sections use nearly every F1DB
table: every session of every weekend since 1950, entry lists, chassis, engines, tyres,
countries and families. Loaded whole, that is over 20 MB of JSON.

## Decision

- `history/index.json` (drivers, teams, circuits, races) stays the one file every archive
  page loads.
- `history/seasons/<year>.json` holds one season's weekends with every session, its entry
  list and season tables. A page loads only the season it shows (10–65 KB gzipped).
- `history/catalog.json` holds engines, tyres, team cars by season, families and countries
  (about 30 KB gzipped), loaded by the pages that need them.
- `history/records.json` holds leaderboards that would otherwise need every season file
  (closest finishes, winning margins, pit-crew medians).
- Every file has a Zod schema in `packages/tools/src/data/archive-schema.ts` and is validated
  on load.

## Consequences

- Most archive pages fetch one or two small files.
- Cross-season questions that aren't precomputed need a new record in `records.json` rather
  than loading every season in the browser.
