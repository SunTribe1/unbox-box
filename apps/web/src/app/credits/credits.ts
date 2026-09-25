/**
 * Everything Unbox Box uses, with its licence (checked against each project's GitHub licence,
 * 2026-09-24). `test/credits.test.ts` keeps this list in step with package.json.
 */

export interface Credit {
  name: string
  href: string
  license: string
  note?: string
}

export const DATA: Credit[] = [
  {
    name: 'F1DB',
    href: 'https://github.com/f1db/f1db',
    license: 'CC BY 4.0',
    note: 'By Marcel Overdijk and contributors. Every World Championship weekend since 1950: practice, qualifying, grids, sprints, results, pit stops, fastest laps, Driver of the Day votes, standings, entry lists, chassis, engines, tyres, circuits, layouts, countries and driver families. Changes: selected tables and columns, split into per-season files, record books and pit-crew medians derived, converted to compact JSON.',
  },
  {
    name: 'TracingInsights',
    href: 'https://github.com/TracingInsights',
    license: 'MIT · Apache-2.0',
    note: 'Telemetry, lap times, pit stops, race control messages and corner positions (DOI 10.5281/zenodo.17312802). The 2023 and 2024 archives are MIT; 2025 and 2026 are Apache-2.0. Changes: laps resampled onto a distance grid with time derived from speed and anchored to official sector times; race positions converted to per-second track progress; circuit outlines built from laps; converted to compact JSON.',
  },
  {
    name: 'FastF1',
    href: 'https://github.com/theOehrly/Fast-F1',
    license: 'MIT',
    note: 'By Philipp Schäfer and contributors. The library TracingInsights uses to collect timing and telemetry.',
  },
  {
    name: 'Jolpica-F1',
    href: 'https://github.com/jolpica/jolpica-f1',
    license: 'Apache-2.0',
    note: 'Ergast-compatible results API used by FastF1.',
  },
  {
    name: 'MultiViewer',
    href: 'https://github.com/f1multiviewer',
    license: 'Credit',
    note: 'Circuit corner information, via FastF1 and TracingInsights.',
  },
]

export const SERVICES: Credit[] = [
  {
    name: 'GitHub',
    href: 'https://github.com',
    license: 'Terms of Service',
    note: 'Hosts the source datasets; the data pipeline reads the TracingInsights archives through raw.githubusercontent.com and the public REST API, within its rate limits.',
  },
  {
    name: 'Hugging Face',
    href: 'https://huggingface.co',
    license: 'Terms of Service',
    note: 'Hosts the published Unbox Box dataset the app reads.',
  },
  {
    name: 'Web3Forms',
    href: 'https://web3forms.com',
    license: 'Terms of Service',
    note: 'Delivers bug reports and ideas from the Help page by email. Only what the form shows is sent.',
  },
]

export const ASSETS: Credit[] = [
  {
    name: 'flag-icons, by Panayiotis Lipiridis',
    href: 'https://github.com/lipis/flag-icons',
    license: 'MIT',
  },
  {
    name: 'Geist and Geist Mono, by Vercel',
    href: 'https://github.com/vercel/geist-font',
    license: 'OFL-1.1',
  },
  {
    name: 'Lucide icons (includes Feather, MIT)',
    href: 'https://github.com/lucide-icons/lucide',
    license: 'ISC',
  },
]

export const SOFTWARE: Credit[] = [
  { name: 'Next.js', href: 'https://github.com/vercel/next.js', license: 'MIT' },
  { name: 'React', href: 'https://github.com/facebook/react', license: 'MIT' },
  { name: 'Tailwind CSS', href: 'https://github.com/tailwindlabs/tailwindcss', license: 'MIT' },
  { name: 'shadcn/ui patterns', href: 'https://github.com/shadcn-ui/ui', license: 'MIT' },
  { name: 'Radix UI primitives', href: 'https://github.com/radix-ui/primitives', license: 'MIT' },
  { name: 'Motion', href: 'https://github.com/motiondivision/motion', license: 'MIT' },
  { name: 'uPlot', href: 'https://github.com/leeoniya/uPlot', license: 'MIT' },
  { name: 'Recharts', href: 'https://github.com/recharts/recharts', license: 'MIT' },
  { name: 'TanStack Query', href: 'https://github.com/TanStack/query', license: 'MIT' },
  { name: 'Zustand', href: 'https://github.com/pmndrs/zustand', license: 'MIT' },
  { name: 'Zod', href: 'https://github.com/colinhacks/zod', license: 'MIT' },
  { name: 'dnd kit', href: 'https://github.com/clauderic/dnd-kit', license: 'MIT' },
  { name: 'cmdk', href: 'https://github.com/dip/cmdk', license: 'MIT' },
  { name: 'Sonner', href: 'https://github.com/emilkowalski/sonner', license: 'MIT' },
  { name: 'Vaul', href: 'https://github.com/emilkowalski/vaul', license: 'MIT' },
  { name: 'next-themes', href: 'https://github.com/pacocoursey/next-themes', license: 'MIT' },
  { name: 'html-to-image', href: 'https://github.com/bubkoo/html-to-image', license: 'MIT' },
  {
    name: 'clsx, tailwind-merge, tw-animate-css',
    href: 'https://github.com/lukeed/clsx',
    license: 'MIT',
  },
  {
    name: 'class-variance-authority',
    href: 'https://github.com/joe-bell/cva',
    license: 'Apache-2.0',
  },
  {
    name: 'NumPy (data pipeline)',
    href: 'https://github.com/numpy/numpy',
    license: 'BSD-3-Clause',
  },
]

/** Used to build the site but not shipped in it (the static export contains none of these). */
export const BUILD_TOOLS: Credit[] = [
  { name: 'TypeScript', href: 'https://github.com/microsoft/TypeScript', license: 'Apache-2.0' },
  {
    name: 'PostCSS, Lightning CSS (via Tailwind)',
    href: 'https://github.com/tailwindlabs/tailwindcss',
    license: 'MIT · MPL-2.0',
  },
  {
    name: 'sharp and libvips (installed with Next.js; unused, images are unoptimized)',
    href: 'https://github.com/lovell/sharp',
    license: 'Apache-2.0 · LGPL',
  },
  {
    name: 'Can I use data (caniuse-lite, by Alexis Deveria)',
    href: 'https://github.com/Fyrd/caniuse',
    license: 'CC BY 4.0',
  },
  {
    name: 'uv (Python packaging)',
    href: 'https://github.com/astral-sh/uv',
    license: 'Apache-2.0 · MIT',
  },
  {
    name: 'huggingface_hub (dataset upload)',
    href: 'https://github.com/huggingface/huggingface_hub',
    license: 'Apache-2.0',
  },
]

/** Development and testing only. */
export const DEV_TOOLS: Credit[] = [
  { name: 'Vitest', href: 'https://github.com/vitest-dev/vitest', license: 'MIT' },
  { name: 'Playwright', href: 'https://github.com/microsoft/playwright', license: 'Apache-2.0' },
  {
    name: 'axe-core (accessibility checks)',
    href: 'https://github.com/dequelabs/axe-core',
    license: 'MPL-2.0',
  },
  { name: 'ESLint, typescript-eslint', href: 'https://github.com/eslint/eslint', license: 'MIT' },
  {
    name: 'Prettier, prettier-plugin-tailwindcss',
    href: 'https://github.com/prettier/prettier',
    license: 'MIT',
  },
  { name: 'CSpell', href: 'https://github.com/streetsidesoftware/cspell', license: 'MIT' },
  { name: 'knip', href: 'https://github.com/webpro-nl/knip', license: 'ISC' },
  { name: 'Ruff', href: 'https://github.com/astral-sh/ruff', license: 'MIT' },
  { name: 'pytest', href: 'https://github.com/pytest-dev/pytest', license: 'MIT' },
  {
    name: 'React Testing Library, user-event, jest-dom',
    href: 'https://github.com/testing-library/react-testing-library',
    license: 'MIT',
  },
  { name: 'jsdom', href: 'https://github.com/jsdom/jsdom', license: 'MIT' },
  {
    name: 'Husky, lint-staged, commitlint',
    href: 'https://github.com/typicode/husky',
    license: 'MIT',
  },
  { name: 'Stylelint', href: 'https://github.com/stylelint/stylelint', license: 'MIT' },
]

/** Attribution in the form each data licence asks for: title, author, source, licence and
 *  what we changed. */
export const ATTRIBUTIONS: string[] = [
  '“F1DB” by Marcel Overdijk and contributors (github.com/f1db/f1db), licensed under CC BY 4.0 (creativecommons.org/licenses/by/4.0). Adapted by Unbox Box: tables selected and reshaped, records derived.',
  '“TracingInsights 2023” and “TracingInsights 2024” by TracingInsights-Archive (github.com/TracingInsights), MIT License. Adapted by Unbox Box: resampled, aligned and reshaped.',
  '“TracingInsights 2025” and “TracingInsights 2026” by TracingInsights (github.com/TracingInsights), Apache License 2.0. Adapted by Unbox Box: resampled, aligned and reshaped.',
]

/** Everything the site keeps in the browser (no cookies, no analytics). */
export const STORAGE: [key: string, what: string][] = [
  ['theme', 'Light or dark mode (next-themes)'],
  ['unboxbox:recent-sessions', 'The last five sessions you opened'],
  ['unboxbox:engineer-docked', 'Whether the Race Engineer panel is open on wide screens'],
  ['unboxbox:feedback-sent', 'When you last sent a report, for a one-minute cooldown'],
]
