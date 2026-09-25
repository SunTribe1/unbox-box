import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ASSETS,
  ATTRIBUTIONS,
  BUILD_TOOLS,
  DATA,
  DEV_TOOLS,
  SERVICES,
  SOFTWARE,
} from '../src/app/credits/credits'

/** Which credit covers each production dependency. Adding a dependency without a credit
 *  fails this test, so the Credits page can't fall behind. */
const CREDIT_FOR: Record<string, string> = {
  '@dnd-kit/core': 'dnd kit',
  '@dnd-kit/sortable': 'dnd kit',
  '@dnd-kit/utilities': 'dnd kit',
  '@fontsource-variable/geist': 'Geist and Geist Mono, by Vercel',
  '@fontsource-variable/geist-mono': 'Geist and Geist Mono, by Vercel',
  '@shadcn/react': 'shadcn/ui patterns',
  '@tanstack/react-query': 'TanStack Query',
  'class-variance-authority': 'class-variance-authority',
  clsx: 'clsx, tailwind-merge, tw-animate-css',
  cmdk: 'cmdk',
  'html-to-image': 'html-to-image',
  'lucide-react': 'Lucide icons (includes Feather, MIT)',
  motion: 'Motion',
  next: 'Next.js',
  'next-themes': 'next-themes',
  'radix-ui': 'Radix UI primitives',
  react: 'React',
  'react-dom': 'React',
  recharts: 'Recharts',
  sonner: 'Sonner',
  'tailwind-merge': 'clsx, tailwind-merge, tw-animate-css',
  'tw-animate-css': 'clsx, tailwind-merge, tw-animate-css',
  uplot: 'uPlot',
  vaul: 'Vaul',
  zod: 'Zod',
  zustand: 'Zustand',
}

const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')) as {
  dependencies: Record<string, string>
}
const all = [...DATA, ...SERVICES, ...ASSETS, ...SOFTWARE, ...BUILD_TOOLS, ...DEV_TOOLS]

describe('credits', () => {
  it('credit every production dependency', () => {
    const deps = Object.keys(pkg.dependencies).filter((d) => !d.startsWith('@unbox-box/'))
    const names = new Set(all.map((c) => c.name))
    for (const dep of deps) {
      expect(CREDIT_FOR[dep], `${dep} has no credit`).toBeDefined()
      expect(names.has(CREDIT_FOR[dep]!), `${dep} → "${CREDIT_FOR[dep]}"`).toBe(true)
    }
  })

  it('give every credit a licence and a real link', () => {
    for (const c of all) {
      expect(c.license, c.name).not.toBe('')
      expect(c.href, c.name).toMatch(/^https:\/\//)
    }
  })

  it('state both TracingInsights licences', () => {
    const ti = DATA.find((d) => d.name === 'TracingInsights')!
    expect(ti.license).toContain('MIT')
    expect(ti.license).toContain('Apache-2.0')
  })

  it('attribute every data source by name and licence', () => {
    expect(ATTRIBUTIONS.some((a) => a.includes('F1DB') && a.includes('CC BY 4.0'))).toBe(true)
    expect(ATTRIBUTIONS.filter((a) => a.includes('TracingInsights'))).toHaveLength(2)
  })
})
