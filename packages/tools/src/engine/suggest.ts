import { findDriver } from '../data/lookup'
import type { SessionMeta } from '../data/schema'
import type { View } from '../tools/types'

/** Example questions built from the loaded session (its drivers, corners and laps), so they
 *  always work, whatever season or event is open. */

const HISTORY_BASE = [
  'Senna vs Prost',
  'The 2021 title fight',
  'Ferrari history',
  'Tell me about Jim Clark',
]

function lastName(meta: SessionMeta, code: string | undefined): string | null {
  if (!code) return null
  return findDriver(meta, code)?.lastName ?? code
}

function showcaseCorner(meta: SessionMeta): string {
  const named = meta.circuit.corners.filter((c) => c.name)
  const pick =
    named[named.length - 1] ?? meta.circuit.corners[Math.floor(meta.circuit.corners.length / 2)]
  if (!pick) return 'turn 1'
  return pick.name ? `the ${pick.name}` : `turn ${pick.number}`
}

function lapCount(meta: SessionMeta): number {
  return Math.max(0, ...Object.values(meta.laps).map((laps) => laps.length))
}

export function sessionSuggestions(view: View, meta: SessionMeta): string[] {
  const [p1, p2, p3, p4] = meta.results.map((r) => lastName(meta, r.driver))
  const place = meta.circuit.locality ?? meta.circuit.name
  const out: (string | null | false | undefined)[] = []

  if (view === 'history') {
    out.push(`Who won at ${place}?`, `Who has the most wins at ${place}?`, ...HISTORY_BASE)
    return out.filter((x): x is string => !!x)
  }

  if (view === 'replay' || view === 'strategy') {
    const laps = lapCount(meta)
    if (view === 'strategy') {
      out.push(
        p2 && laps > 10 && `What if ${p2} pitted on lap ${Math.round(laps * 0.45)} for hards?`,
        p2 && p3 && laps > 10 && `Could ${p3} undercut ${p2} on lap ${Math.round(laps * 0.3)}?`,
        'How fast did the tyres degrade?',
        p1 && `Show ${p1}'s tyre strategy`,
        'Show all tyre strategies',
      )
    } else {
      out.push(
        'Play at 16x',
        laps > 4 && `Who was leading on lap ${Math.round(laps / 2)}?`,
        p1 && `When did ${p1} pit?`,
        'Jump to the last lap',
        'Show the penalties',
        p1 && p2 && `Compare ${p1} and ${p2}`,
      )
    }
    return out.filter((x): x is string => !!x).slice(0, 6)
  }

  const segments = new Set(
    (meta.laps[meta.results[0]?.driver ?? ''] ?? [])
      .filter((l) => l.telemetry)
      .map((l) => l.segment),
  )
  out.push(
    p1 && p2 && `Where did ${p2} lose time to ${p1}?`,
    p3 && p4 && `Compare ${p3} and ${p4}`,
    `Show me ${showcaseCorner(meta)}`,
    'Who was fastest in sector 2?',
    p1 &&
      (segments.has('Q2') || segments.has('SQ2')) &&
      (segments.has('Q3') || segments.has('SQ3')) &&
      `${p1}'s Q2 lap vs Q3 lap`,
    meta.replay && 'Watch the race at 16x',
  )
  return out.filter((x): x is string => !!x).slice(0, 6)
}
