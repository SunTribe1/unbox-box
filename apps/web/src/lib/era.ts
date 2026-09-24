/** Era filters for the Record Book: a decade ("1990s") or a span of years ("2010-2026"). */

/** The decades the era filters offer, newest first. */
export const DECADES = [2020, 2010, 2000, 1990, 1980, 1970, 1960, 1950] as const

/** "1990s" → 1990–1999; "2010-2026" → 2010–2026; anything else → all time. */
export function eraRange(era: string | undefined): { from?: number; to?: number } {
  const decade = era?.match(/^(\d{4})s$/)
  if (decade) return { from: Number(decade[1]), to: Number(decade[1]) + 9 }
  const span = era?.match(/^(\d{4})-(\d{4})$/)
  if (span && Number(span[1]) <= Number(span[2]))
    return { from: Number(span[1]), to: Number(span[2]) }
  return {}
}

/** "1990s" → "The 1990s"; "2010-2026" → "2010–2026". */
export function eraLabel(era: string): string {
  if (/^\d{4}s$/.test(era)) return `The ${era}`
  const r = eraRange(era)
  return r.from != null ? `${r.from}–${r.to}` : 'All time'
}
