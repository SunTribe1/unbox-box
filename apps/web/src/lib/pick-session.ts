import type { View } from '@unbox-box/tools'

interface SessionEntry {
  id: string
  session: string
}

/** Views that need a race: the replay and the strategy tools have nothing to show for
 *  qualifying or practice. */
export const RACE_VIEWS: readonly View[] = ['replay', 'strategy']

/** The session to open: the one the link names, else the latest session that suits the view.
 *  The index is newest first, so "latest" is the first match. Without this, opening Race
 *  Replay right after a qualifying session showed Lap Duel instead. */
export function pickSession(
  sessions: readonly SessionEntry[],
  wanted: { sessionId?: string; view?: View },
): string | undefined {
  const named = sessions.find((s) => s.id === wanted.sessionId)
  if (named) return named.id
  if (wanted.view && RACE_VIEWS.includes(wanted.view)) {
    const race = sessions.find((s) => s.session === 'Race')
    if (race) return race.id
  }
  return sessions[0]?.id
}
