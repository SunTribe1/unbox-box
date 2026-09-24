/** Formatting helpers used by the UI, the tools and the answers (one implementation each). */

export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  const minutes = Math.floor(seconds / 60)
  const rest = seconds - minutes * 60
  const secs = rest.toFixed(3).padStart(6, '0')
  return minutes > 0 ? `${minutes}:${secs}` : rest.toFixed(3)
}

export function formatGap(seconds: number | null | undefined, digits = 3): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—'
  const sign = seconds > 0 ? '+' : seconds < 0 ? '−' : '±'
  return `${sign}${Math.abs(seconds).toFixed(digits)}`
}

export function formatSeconds(seconds: number, digits = 3): string {
  return `${Math.abs(seconds).toFixed(digits)}s`
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

const KEEP_UPPER = new Set([
  'FIA',
  'DRS',
  'SC',
  'VSC',
  'DNF',
  'DSQ',
  'FP1',
  'FP2',
  'FP3',
  'Q1',
  'Q2',
  'Q3',
])

/** Race-control messages arrive in capitals. Sentence case reads better, but acronyms and
 *  driver codes in brackets ("(SAI)") stay upper case. */
export function formatRaceControl(message: string): string {
  const lower = message
    .toLowerCase()
    .replace(/\(([a-z]{3})\)/g, (_, c: string) => `(${c.toUpperCase()})`)
  const words = lower.replace(/\b[a-z0-9]+\b/g, (w) =>
    KEEP_UPPER.has(w.toUpperCase()) ? w.toUpperCase() : w,
  )
  return words.replace(/^[a-z]/, (c) => c.toUpperCase())
}
