// CSS lint for the app's stylesheet. Standard rules, taught Tailwind CSS v4's at-rules and
// functions so they are not flagged as unknown.
/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['**/node_modules/**', '**/out/**', '**/.next/**', '**/coverage/**'],
  rules: {
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'theme',
          'utility',
          'variant',
          'custom-variant',
          'apply',
          'source',
          'plugin',
          'config',
          'reference',
        ],
      },
    ],
    'function-no-unknown': [true, { ignoreFunctions: ['theme', '--spacing', '--alpha'] }],
    // Tailwind's `@import 'tailwindcss'` and `@import 'tw-animate-css'` are package imports.
    'import-notation': 'string',
    // Design tokens follow the shadcn names (--color-sidebar-accent-foreground, ...).
    'custom-property-pattern': null,
    // @apply takes Tailwind class names, which this rule can't parse as a CSS prelude.
    'at-rule-prelude-no-invalid': [true, { ignoreAtRules: ['apply'] }],
    // `&` inside Tailwind's @utility blocks is valid nesting; stylelint can't see the root.
    'nesting-selector-no-missing-scoping-root': null,
  },
}
