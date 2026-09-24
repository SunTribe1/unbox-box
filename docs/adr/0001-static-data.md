# ADR 0001: Static data files instead of a backend

**Status:** accepted · 2026-09-23

## Context

Unbox Box is a free hobby project with a $0 budget. Visitors must need nothing: no account,
no key, no install. F1 data changes only after each session.

## Decision

A Python pipeline builds compact JSON files once per session and the web app is a static
export. The browser fetches only the files a view needs (about 110 KB for one lap duel).

## Consequences

- Hosting is free (Vercel Hobby, Cloudflare Pages or GitHub Pages) and scales with a CDN.
- No API to secure or rate-limit, and upstream sources are never hit by visitors.
- Heavier queries later (history across seasons) will use DuckDB-WASM over Parquet, loaded
  lazily so the first view stays small.
