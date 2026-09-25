import type { SeasonArchive, SessionRow, Weekend, WeekendSession } from '../data/archive-schema'

/** Race weekends from the season archive: which sessions exist, in what order, and how to
 *  print their times. */

export const SESSION_LABELS: Record<WeekendSession, string> = {
  race: 'Race',
  qualifying: 'Qualifying',
  grid: 'Starting grid',
  sprint: 'Sprint',
  sprintQualifying: 'Sprint qualifying',
  sprintGrid: 'Sprint grid',
  qualifying1: 'Qualifying 1',
  qualifying2: 'Qualifying 2',
  preQualifying: 'Pre-qualifying',
  fp1: 'Practice 1',
  fp2: 'Practice 2',
  fp3: 'Practice 3',
  fp4: 'Practice 4',
  warmup: 'Warm-up',
  pitStops: 'Pit stops',
  fastestLaps: 'Fastest laps',
  driverOfTheDay: 'Driver of the Day',
}

/** Display order: the result first, then how it got there, then the rest of the weekend. */
const ORDER: WeekendSession[] = [
  'race',
  'qualifying',
  'grid',
  'sprint',
  'sprintQualifying',
  'sprintGrid',
  'qualifying1',
  'qualifying2',
  'preQualifying',
  'fp1',
  'fp2',
  'fp3',
  'fp4',
  'warmup',
  'fastestLaps',
  'pitStops',
  'driverOfTheDay',
]

export function weekendSessions(w: Weekend): WeekendSession[] {
  return ORDER.filter((s) => (w.sessions[s]?.length ?? 0) > 0)
}

export function findWeekend(season: SeasonArchive, round: number): Weekend | undefined {
  return season.races.find((r) => r.round === round)
}

/** 5504742 → "1:31:44.742"; 81046 → "1:21.046"; 8757 → "8.757". */
export function formatMillis(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = ((ms % 60_000) / 1000).toFixed(3)
  if (h) return `${h}:${String(m).padStart(2, '0')}:${s.padStart(6, '0')}`
  if (m) return `${m}:${s.padStart(6, '0')}`
  return s
}

/** The time column for a result row: winner's race time, "+12.345", "+1 lap", or the reason
 *  they stopped. */
export function resultTime(row: SessionRow, isWinner: boolean): string {
  if (row.retired) return row.retired
  if (isWinner && row.time != null) return formatMillis(row.time)
  if (row.gapLaps) return `+${row.gapLaps} lap${row.gapLaps > 1 ? 's' : ''}`
  if (row.gap != null) return `+${formatMillis(row.gap)}`
  if (row.time != null) return formatMillis(row.time)
  return ''
}

/** Best qualifying time a driver set in the weekend's knockout (Q3, else Q2, else Q1). */
export function bestQualifying(row: SessionRow): number | undefined {
  return row.q3 ?? row.q2 ?? row.q1 ?? row.time
}

export interface WeekendHeadline {
  winner?: SessionRow | undefined
  pole?: SessionRow | undefined
  fastestLap?: SessionRow | undefined
  driverOfTheDay?: SessionRow | undefined
  /** Fastest stop of the race (pit-lane time as F1DB records it). */
  fastestStop?: SessionRow | undefined
  finishers: number
  starters: number
}

export function weekendHeadline(w: Weekend): WeekendHeadline {
  const race = w.sessions.race ?? []
  const stops = w.sessions.pitStops ?? []
  return {
    winner: race.find((r) => r.pos === 1),
    pole:
      w.sessions.qualifying?.find((r) => r.pos === 1) ??
      w.sessions.grid?.find((r) => r.pos === 1) ??
      race.find((r) => r.pole),
    fastestLap: w.sessions.fastestLaps?.find((r) => r.pos === 1) ?? race.find((r) => r.fastestLap),
    driverOfTheDay: w.sessions.driverOfTheDay?.find((r) => r.pos === 1),
    fastestStop: stops.reduce<SessionRow | undefined>(
      (best, s) => (s.time != null && (best?.time == null || s.time < best.time) ? s : best),
      undefined,
    ),
    finishers: race.filter((r) => r.pos != null).length,
    starters: race.filter((r) => !['DNQ', 'DNPQ', 'DNS', 'DNP'].includes(r.text ?? '')).length,
  }
}
