import { z } from 'zod'

// Imported first by index.ts, before any schema exists. Zod 4 probes `new Function` to compile
// faster parsers; sites with a strict Content-Security-Policy (like Unbox Box) forbid eval, so
// the probe logs a CSP violation. Parsing is fast enough without it.
z.config({ jitless: true })
