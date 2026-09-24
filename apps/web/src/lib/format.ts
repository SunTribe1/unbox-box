/** UI formatting shared across views. Race formatting (lap times, gaps) lives in
 *  @unbox-box/tools so the agent and the UI print numbers the same way. */

/** "2026-09-06" → "6 Sept 2026" (or "6 Sept" without the year). Noon UTC keeps the day
 *  stable in every time zone. */
export function formatEventDate(date: string | null, { year = true } = {}): string {
  if (!date) return ''
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(year && { year: 'numeric' }),
  })
}
