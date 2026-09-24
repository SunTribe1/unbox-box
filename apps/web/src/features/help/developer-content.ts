/** Words for the Help page's developer section: the stack, where data comes from, how it
 *  flows, WebMCP and how to contribute. Kept apart from the components for easy review. */

export interface StackRow {
  layer: string
  tech: string
  usedFor: string
  license: string
}

export const STACK: StackRow[] = [
  {
    layer: 'Framework',
    tech: 'Next.js 16 (static export), React 19',
    usedFor: 'Pages, routing (/duel/, /races/...), prerendered HTML served as plain files',
    license: 'MIT',
  },
  {
    layer: 'Language',
    tech: 'TypeScript 5.9 (strict), Python 3.10+',
    usedFor: 'The app and packages; the data pipeline',
    license: 'Apache-2.0 · PSF',
  },
  {
    layer: 'Styling',
    tech: 'Tailwind CSS v4, design tokens in globals.css',
    usedFor: 'Every style; light and dark themes from one set of tokens',
    license: 'MIT',
  },
  {
    layer: 'Components',
    tech: 'shadcn/ui patterns on Radix UI primitives',
    usedFor: 'Accessible dialogs, selects, tabs, tooltips, sheets, toggles',
    license: 'MIT',
  },
  {
    layer: 'Motion',
    tech: 'Motion (LazyMotion + m components)',
    usedFor: 'Page entrances, shared-layout transitions, reordering; respects reduced motion',
    license: 'MIT',
  },
  {
    layer: 'Charts',
    tech: 'uPlot, Recharts, hand-drawn SVG and canvas',
    usedFor: 'Telemetry traces (uPlot), stint and season charts (Recharts), track maps',
    license: 'MIT',
  },
  {
    layer: 'Data fetching',
    tech: 'TanStack Query',
    usedFor: 'Loading and caching every JSON file, shared by the UI and the tools',
    license: 'MIT',
  },
  {
    layer: 'State',
    tech: 'Zustand',
    usedFor: 'App state (session, view, selections) mirrored to the URL',
    license: 'MIT',
  },
  {
    layer: 'Validation',
    tech: 'Zod 4',
    usedFor: 'Schemas for every data file, tool inputs and the report form; JSON Schema for WebMCP',
    license: 'MIT',
  },
  {
    layer: 'Agent',
    tech: '@unbox-box/tools, @unbox-box/webmcp',
    usedFor: '27 typed tools, the plain-English command engine, WebMCP registration',
    license: 'MIT (ours)',
  },
  {
    layer: 'Pipeline',
    tech: 'Python, NumPy, uv',
    usedFor: 'Fetch, align, resample and write the data files',
    license: 'BSD-3-Clause · Apache-2.0/MIT',
  },
  {
    layer: 'Hosting',
    tech: 'Static host (Vercel Hobby or any CDN), Hugging Face dataset',
    usedFor: 'The site; the full data archive',
    license: 'Terms of Service',
  },
  {
    layer: 'Feedback',
    tech: 'Web3Forms',
    usedFor: 'Emails bug reports from the Help page; no backend of our own',
    license: 'Terms of Service',
  },
  {
    layer: 'Quality',
    tech: 'Vitest, Playwright + axe, ESLint, Prettier, cspell, knip, ruff, pytest',
    usedFor:
      'Unit, end-to-end, responsive and accessibility tests; lint, format, spelling, dead code',
    license: 'MIT · MPL-2.0 · Apache-2.0',
  },
]

export interface SourceRow {
  name: string
  href: string
  gives: string
  license: string
  code: string
}

export const SOURCES: SourceRow[] = [
  {
    name: 'TracingInsights',
    href: 'https://github.com/TracingInsights',
    gives:
      'Telemetry, laps, sectors, pit stops, race control and corners for every session since 2023',
    license: 'MIT (2023–24), Apache-2.0 (2025–26)',
    code: 'pipeline/unbox_box_pipeline/sources/tracinginsights.py',
  },
  {
    name: 'F1DB',
    href: 'https://github.com/f1db/f1db',
    gives:
      'Every weekend since 1950: results, qualifying, grids, standings, entry lists, engines, tyres, circuits, families',
    license: 'CC BY 4.0',
    code: 'pipeline/unbox_box_pipeline/history.py, archive.py',
  },
  {
    name: 'FastF1 · Jolpica-F1 · MultiViewer',
    href: 'https://github.com/theOehrly/Fast-F1',
    gives: 'Upstream of TracingInsights: timing collection, results API, circuit information',
    license: 'MIT · Apache-2.0 · credit',
    code: 'not called directly',
  },
]

export const FLOW: { step: string; detail: string }[] = [
  {
    step: 'Fetch',
    detail:
      'The pipeline downloads new sessions from TracingInsights and the F1DB release; both are cached.',
  },
  {
    step: 'Build',
    detail:
      'Laps are aligned to official sector times and resampled onto a 5 m grid; races become per-second replays; F1DB becomes compact per-season files.',
  },
  {
    step: 'Publish',
    detail:
      'A scheduled GitHub Action (every three hours) builds anything new and uploads it to a Hugging Face dataset.',
  },
  {
    step: 'Load',
    detail:
      'The static app fetches only the files a view needs, validates each with Zod, and caches them with TanStack Query and a service worker (offline).',
  },
  {
    step: 'Use',
    detail:
      'Views, the command engine and WebMCP agents all call the same typed tools, so what an agent does is what a click does.',
  },
]

export const LAYOUT: [path: string, what: string][] = [
  [
    'apps/web',
    'The Next.js app: src/app (routes), src/features (one folder per section), src/components (shared UI), src/lib (state, data, routes)',
  ],
  [
    'packages/tools',
    'Data schemas, analysis, the 27 tools, the command engine and runner. No React.',
  ],
  [
    'packages/webmcp',
    'The only code that touches the WebMCP API, so spec changes stay in one file',
  ],
  ['pipeline', 'Python: sources, alignment, replay, history and archive builders, publishing'],
  [
    'docs/adr',
    'Architecture decisions: static data, one tool registry, lap-delta alignment, data on Hugging Face',
  ],
]

export const COMMANDS: [command: string, what: string][] = [
  ['npm install', 'Install everything (Node 22+)'],
  ['npm run dev', 'Local app on http://localhost:3000 with the bundled Monza demo data'],
  ['npm run check', 'Format, lint, types, spelling, dead code and unit tests'],
  ['npm run test:coverage', 'Unit tests with coverage gates'],
  [
    'npm run build && npm run test:e2e',
    'Playwright: journeys, responsive matrix, accessibility, offline',
  ],
  ['npm run data:sync', 'Build new sessions and history (needs uv)'],
]

export const WEBMCP_STEPS: string[] = [
  'Use Chrome 146 or newer. For local testing, turn on chrome://flags/#enable-webmcp-testing and relaunch.',
  'Deployed sites can switch it on for every Chrome visitor with a WebMCP origin-trial token: set NEXT_PUBLIC_WEBMCP_ORIGIN_TRIAL and Unbox Box adds the meta tag.',
  'Open Unbox Box. When the API is present, the Race Engineer header shows WebMCP as connected and all tools are registered with document.modelContext.',
  'Ask your browser agent something like "compare Norris and Piastri’s qualifying laps". Each call it makes appears in the Race Engineer panel, and the page changes as if you had clicked.',
]
