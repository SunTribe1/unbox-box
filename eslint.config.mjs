// Lint for the shared packages (the web app has its own Next.js config in apps/web).
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      'apps/**',
      'pipeline/**',
      'data/**',
      'docs/**',
      '**/coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ['packages/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
      // noUncheckedIndexedAccess types every array read as `T | undefined`. The data is
      // columnar (parallel arrays indexed by the same row), so `col[row]!` is the checked,
      // intended read, not an escape hatch.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
)
