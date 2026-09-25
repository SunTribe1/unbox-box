# ADR 0005: Security headers and a Content-Security-Policy for a static site

**Status:** accepted · 2026-09-24

## Context

Unbox Box is a static export with no server, so headers are the host's job. It renders data
from upstream datasets, sends reports to one third-party service, and has no user accounts.
The realistic risks are injected script (through a dependency or data), clickjacking, and
content loaded from somewhere we didn't intend.

## Decision

- One policy, written by `apps/web/scripts/host-config.mjs` before every build into
  `vercel.json` (Vercel), `public/_headers` (Netlify, Cloudflare Pages) and
  `public/serve.json` (local preview and Playwright), so tests run under the real policy.
- CSP: `default-src 'self'`; `connect-src` limited to the site, Hugging Face (the data host
  and its CDNs), Web3Forms and the configured `NEXT_PUBLIC_DATA_BASE`; `object-src 'none'`,
  `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.
- `script-src` allows `'unsafe-inline'`: Next.js inlines hydration data and the theme script,
  a static export can't use nonces, and per-page hashes would make the header enormous.
  Nothing renders user or upstream content as HTML (React escapes it), which keeps this
  acceptable.
- No `'unsafe-eval'`. Zod's eval probe is disabled (`jitless`) so the policy never fires.
- Also: `nosniff`, `strict-origin-when-cross-origin`, a closed `Permissions-Policy`,
  `Cross-Origin-Opener-Policy: same-origin`, `X-Frame-Options: DENY` and HSTS.
- The Playwright suite fails on any CSP violation, console error or page error.

## Consequences

- A new external host (a data mirror, an analytics tool) needs adding to `security-policy.mjs`,
  deliberately.
- Moving to a host that can't set headers would lose the policy; a `<meta>` CSP could cover
  most of it but not `frame-ancestors`.
