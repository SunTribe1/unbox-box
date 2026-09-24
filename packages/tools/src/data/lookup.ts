import type { Driver, Lap, Result, SessionMeta } from './schema'
import { stripAccents } from '../util/text'

/** Lookups shared by tools and the command engine. */

export class LookupError extends Error {
  override name = 'LookupError'
}

function norm(text: string): string {
  return stripAccents(text).toLowerCase().trim()
}

/** Accepts a code (VER), last name, first name, full name or car number. */
export function resolveDriver(meta: SessionMeta, query: string): Driver {
  const q = norm(query).replace(/^#/, '')
  const exact = meta.drivers.find(
    (d) =>
      norm(d.code) === q ||
      d.number === q ||
      norm(d.lastName) === q ||
      norm(`${d.firstName} ${d.lastName}`) === q ||
      norm(d.firstName).split(' ').includes(q),
  )
  if (exact) return exact
  const partial = meta.drivers.filter((d) => norm(d.lastName).startsWith(q) && q.length >= 3)
  if (partial.length === 1) return partial[0]!
  throw new LookupError(
    `Unknown driver "${query}". Drivers in this session: ${meta.drivers.map((d) => d.code).join(', ')}.`,
  )
}

export type LapRef = number | 'best' | 'Q1' | 'Q2' | 'Q3'

/** Picks a lap that has telemetry: a lap number, the driver's classified lap ("best"),
 *  or their best lap in a qualifying segment. */
export function resolveLap(meta: SessionMeta, driver: string, ref: LapRef = 'best'): Lap {
  const laps = meta.laps[driver] ?? []
  const withTel = laps.filter((l) => l.telemetry)
  let lap: Lap | undefined
  if (ref === 'best') {
    const result = findResult(meta, driver)
    lap = withTel.find((l) => l.lap === result?.lap)
  } else if (typeof ref === 'number') {
    lap = withTel.find((l) => l.lap === ref)
  } else {
    // Sprint qualifying names its segments SQ1–SQ3; "Q3" means the same thing there.
    lap = withTel.find((l) => l.segment === ref || l.segment === `S${ref}`)
  }
  if (!lap) {
    const options = withTel.map((l) => `lap ${l.lap}${l.segment ? ` (${l.segment})` : ''}`)
    throw new LookupError(
      `No telemetry for ${driver} ${typeof ref === 'number' ? `lap ${ref}` : ref}. Available: ${options.join(', ') || 'none'}.`,
    )
  }
  return lap
}

export function resolveCorner(meta: SessionMeta, query: string | number): number {
  if (typeof query === 'number') {
    if (meta.circuit.corners.some((c) => c.number === query)) return query
  } else {
    const q = norm(query)
    const n = Number(q.replace(/^(t|turn|corner)\s*/, ''))
    if (Number.isInteger(n) && meta.circuit.corners.some((c) => c.number === n)) return n
    const alias = meta.circuit.aliases[q]
    if (alias != null) return alias
    const byName = meta.circuit.corners.find((c) => c.name && norm(c.name).includes(q))
    if (byName) return byName.number
  }
  throw new LookupError(
    `Unknown corner "${query}". This track has turns 1–${meta.circuit.corners.length}.`,
  )
}

/** The session's driver with this three-letter code, if they took part. */
export function findDriver(meta: SessionMeta, code: string): Driver | undefined {
  return meta.drivers.find((d) => d.code === code)
}

/** The classification row for this driver code, if they were classified. */
export function findResult(meta: SessionMeta, code: string): Result | undefined {
  return meta.results.find((r) => r.driver === code)
}

export function driverName(meta: SessionMeta, code: string): string {
  const d = findDriver(meta, code)
  return d ? `${d.firstName} ${d.lastName}` : code
}
