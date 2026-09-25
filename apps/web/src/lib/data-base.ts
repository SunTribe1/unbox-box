/** Where the data files live: NEXT_PUBLIC_DATA_BASE, or the copy bundled with the site.
 *  A blank or malformed setting falls back to the bundled copy rather than breaking every
 *  page (an empty variable on the host once pointed the app at the site root). */
export const BUNDLED_DATA = '/data'

export function resolveDataBase(raw: string | undefined): string {
  const value = raw?.trim().replace(/\/+$/, '')
  if (!value) return BUNDLED_DATA
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' || url.protocol === 'http:') return value
  } catch {
    // fall through
  }
  console.warn(`[unbox-box] ignoring NEXT_PUBLIC_DATA_BASE "${value}"; using the bundled data`)
  return BUNDLED_DATA
}

export const DATA_BASE = resolveDataBase(process.env.NEXT_PUBLIC_DATA_BASE)
