import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // The app's tsconfig preserves JSX for Next; tests compile it themselves.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      // Browser glue (hooks, URL sync, the agent context, exports) is covered by Playwright.
      exclude: [
        'src/lib/use-*.ts',
        'src/lib/url-sync.ts',
        'src/lib/context.ts',
        'src/lib/view-export.ts',
        'src/lib/brand.ts',
      ],
      thresholds: { statements: 80, branches: 70, functions: 80, lines: 80 },
      reporter: ['text-summary', 'html'],
    },
  },
})
