/** One source for tyre compound colours and names. The colours are theme tokens
 *  (`--tyre-*` in globals.css) so every chart, chip and icon matches in both themes. */

const TOKEN: Record<string, string> = {
  SOFT: 'tyre-soft',
  MEDIUM: 'tyre-medium',
  HARD: 'tyre-hard',
  INTERMEDIATE: 'tyre-inter',
  WET: 'tyre-wet',
}

/** Unknown or missing compounds use the neutral `--even` token everywhere. */
const FALLBACK = 'even'

const BG: Record<string, string> = {
  'tyre-soft': 'bg-tyre-soft',
  'tyre-medium': 'bg-tyre-medium',
  'tyre-hard': 'bg-tyre-hard',
  'tyre-inter': 'bg-tyre-inter',
  'tyre-wet': 'bg-tyre-wet',
  even: 'bg-even',
}

/** Tailwind background class for a compound (listed in full so Tailwind can see it). */
export function compoundBg(compound: string | null | undefined): string {
  return BG[TOKEN[compound ?? ''] ?? FALLBACK]!
}

/** CSS colour for a compound, for SVG fills and inline styles. */
export function compoundColor(compound: string | null | undefined): string {
  return `var(--${TOKEN[compound ?? ''] ?? FALLBACK})`
}

/** "MEDIUM" → "Medium". */
export function compoundName(compound: string): string {
  return compound.charAt(0) + compound.slice(1).toLowerCase()
}
