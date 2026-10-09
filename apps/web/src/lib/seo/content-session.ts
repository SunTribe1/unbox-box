import { formatGap, formatLapTime, type SessionSummary } from '@unbox-box/tools'
import {
  circuitPath,
  driverPath,
  listOf,
  ordinal,
  pathOf,
  plural,
  racePath,
  roundKey,
  type SeoCell,
  type SeoContent,
  type SeoLink,
  type SeoLinkGroup,
  sessionLinks,
} from './content'
import type { HistoryContext } from './content-history'
import type { SeoReplay, SeoSessionDetail, SeoSessionMeta } from './session-source'

/** Summaries for the Lap Duel, Strategy Lab and Race Replay pages of one session. Each view
 *  shows a different side of the session, so the three pages of a race never read alike. */

type Result = SeoSessionMeta['results'][number]

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five']
const stopWord = (n: number) => (n === 0 ? 'no-stop' : `${NUMBER_WORDS[n] ?? n}-stop`)
const compound = (c: string) => c.charAt(0) + c.slice(1).toLowerCase()
const byPosition = (a: Result, b: Result) => a.position - b.position

/** Driver codes to their history pages, for drivers racing that season. */
function driverLinker({ h, lookup }: HistoryContext, season: number) {
  const byCode = new Map<string, number>()
  h.drivers.forEach((d, i) => {
    const code = d.abbr ?? d.code
    const raced = (d.firstYear ?? Infinity) <= season && (d.lastYear ?? -Infinity) >= season
    if (code && raced && lookup.hasDriverPage(i)) byCode.set(code, i)
  })
  return (meta: SeoSessionMeta, code: string): SeoCell => {
    const d = meta.drivers.find((x) => x.code === code)
    const name = d ? `${d.firstName} ${d.lastName}` : code
    const i = byCode.get(code)
    return i == null ? name : { text: name, href: driverPath(h.drivers[i]!.id) }
  }
}

const teamOf = (meta: SeoSessionMeta, code: string) =>
  meta.drivers.find((d) => d.code === code)?.team ?? '—'

const text = (cell: SeoCell) => (typeof cell === 'string' ? cell : cell.text)

function setting(meta: SeoSessionMeta): string {
  const { airTemp, trackTemp } = meta.weather
  const corners = meta.circuit.corners.length
  const track = `${meta.circuit.name}: ${(meta.circuit.length / 1000).toFixed(3)} km${corners ? `, ${plural(corners, 'corner')}` : ''}.`
  const weather =
    airTemp != null && trackTemp != null
      ? ` Air temperature ${airTemp}°C, track ${trackTemp}°C.`
      : ''
  return track + weather
}

/** Qualifying-style sessions: the order of everyone's best lap. */
function qualifyingContent(meta: SeoSessionMeta, link: ReturnType<typeof driverLinker>) {
  const rows = [...meta.results].sort(byPosition)
  const [first, second] = rows
  const intro: string[] = []
  if (first?.time != null) {
    const gap =
      second?.time != null
        ? `, ${(second.time - first.time).toFixed(3)}s ahead of ${text(link(meta, second.driver))}`
        : ''
    const what = meta.session === 'Qualifying' ? 'took pole position' : 'was fastest'
    intro.push(
      `${text(link(meta, first.driver))} ${what} in ${meta.session.toLowerCase()} for the ${meta.season} ${meta.event} with ${formatLapTime(first.time)}${gap}.`,
    )
  }
  intro.push(setting(meta))
  return {
    intro,
    table: {
      caption: `${meta.season} ${meta.event} ${meta.session.toLowerCase()} results`,
      head: ['Pos', 'Driver', 'Team', 'Best lap', 'Gap', 'Session'],
      rows: rows.map((r) => [
        String(r.position),
        link(meta, r.driver),
        teamOf(meta, r.driver),
        formatLapTime(r.time),
        r.time != null && first?.time != null && r !== first ? formatGap(r.time - first.time) : '',
        r.segment ?? '',
      ]),
    },
  }
}

/** Races and sprints: everyone's fastest lap, quickest first. */
function fastestLapContent(meta: SeoSessionMeta, link: ReturnType<typeof driverLinker>) {
  const timed = meta.results.filter((r) => r.time != null).sort((a, b) => a.time! - b.time!)
  const best = timed[0]
  const winner = [...meta.results].sort(byPosition)[0]
  const intro: string[] = []
  if (best)
    intro.push(
      `${text(link(meta, best.driver))} set the fastest lap of the ${meta.season} ${meta.event} ${meta.session.toLowerCase()}, ${formatLapTime(best.time)}${best.lap ? ` on lap ${best.lap}` : ''}.`,
    )
  if (winner) intro.push(`${text(link(meta, winner.driver))} won.`)
  intro.push(setting(meta))
  return {
    intro,
    table: {
      caption: `Fastest laps, ${meta.season} ${meta.event} ${meta.session.toLowerCase()}`,
      head: ['Rank', 'Driver', 'Team', 'Fastest lap', 'Lap', 'Gap', 'Speed trap'],
      rows: timed.map((r, i) => [
        String(i + 1),
        link(meta, r.driver),
        teamOf(meta, r.driver),
        formatLapTime(r.time),
        r.lap ? String(r.lap) : '',
        i === 0 ? '' : formatGap(r.time! - best!.time!),
        r.speedTrap ? `${Math.round(r.speedTrap)} km/h` : '',
      ]),
    },
  }
}

function neutralisations(replay: SeoReplay): string | null {
  const count = (status: 'sc' | 'vsc' | 'red') =>
    replay.trackStatus.filter((s) => s.status === status).length
  const parts = [
    count('sc') && plural(count('sc'), 'safety car period'),
    count('vsc') && plural(count('vsc'), 'virtual safety car'),
    count('red') && plural(count('red'), 'red flag'),
  ].filter((p): p is string => !!p)
  return parts.length ? `The race had ${listOf(parts)}.` : null
}

function strategyContent(
  meta: SeoSessionMeta,
  replay: SeoReplay,
  link: ReturnType<typeof driverLinker>,
) {
  const order = [...meta.results].sort(byPosition).map((r) => r.driver)
  const stops = (code: string) => Math.max(0, (replay.stints[code]?.length ?? 1) - 1)
  const plan = (code: string) =>
    (replay.stints[code] ?? []).map((s) => `${compound(s.compound)} ${s.from}–${s.to}`).join(', ')
  const intro: string[] = []
  const winner = order[0]
  if (winner && replay.stints[winner]) {
    const tyres = replay.stints[winner].map((s) => compound(s.compound)).join(' → ')
    intro.push(
      `${text(link(meta, winner))} won the ${meta.season} ${meta.event} on a ${stopWord(stops(winner))} strategy (${tyres}).`,
    )
  }
  const tally = new Map<number, number>()
  for (const code of order) tally.set(stops(code), (tally.get(stops(code)) ?? 0) + 1)
  const [common, count] = [...tally].sort((a, b) => b[1] - a[1])[0] ?? []
  if (common != null && count)
    intro.push(`${count} of ${order.length} drivers made ${plural(common, 'stop')}.`)
  const timed = replay.pits.filter((p) => p.duration != null)
  const quickest = timed.sort((a, b) => a.duration! - b.duration!)[0]
  if (quickest)
    intro.push(
      `${plural(replay.pits.length, 'pit stop')} in all; the quickest pit lane pass was ${quickest.duration!.toFixed(1)}s, by ${text(link(meta, quickest.driver))} on lap ${quickest.lap}.`,
    )
  const neutral = neutralisations(replay)
  if (neutral) intro.push(neutral)
  return {
    intro,
    table: {
      caption: `Tyre strategy, ${meta.season} ${meta.event}`,
      head: ['Pos', 'Driver', 'Team', 'Stops', 'Stints (tyre, laps)'],
      rows: order.map((code, i) => [
        String(i + 1),
        link(meta, code),
        teamOf(meta, code),
        String(stops(code)),
        plan(code) || '—',
      ]),
    },
  }
}

const finishedRace = (x: Result) => x.status === 'Finished' || !!x.status?.startsWith('+')

function gapText(x: Result): string {
  if (x.position === 1) return 'Winner'
  if (x.status === 'Finished' && x.raceTime != null) return formatGap(x.raceTime)
  return x.status ?? ''
}

function replayContent(
  ctx: HistoryContext,
  meta: SeoSessionMeta,
  replay: SeoReplay | undefined,
  link: ReturnType<typeof driverLinker>,
) {
  const { h, r, lookup } = ctx
  const race =
    meta.round == null ? undefined : lookup.raceByRound.get(roundKey(meta.season, meta.round))
  const grid = new Map<string, number>()
  for (const row of race == null ? [] : (lookup.rowsByRace[race] ?? [])) {
    const code = h.drivers[r.driver[row]!]?.abbr
    if (code && r.grid[row]! > 0) grid.set(code, r.grid[row]!)
  }
  const rows = [...meta.results].sort(byPosition)
  const finished = rows.filter(finishedRace)
  const [p1, p2, p3] = rows
  const intro: string[] = []
  if (p1 && p2 && p3) {
    const margin = p2.raceTime != null ? `, ${p2.raceTime.toFixed(3)}s ahead of` : ' ahead of'
    intro.push(
      `${text(link(meta, p1.driver))} won the ${meta.season} ${meta.event}${margin} ${text(link(meta, p2.driver))}, with ${text(link(meta, p3.driver))} third.`,
    )
  }
  const laps = replay?.totalLaps
  const finishers = `${finished.length} of ${rows.length} cars finished`
  intro.push(laps ? `Over ${plural(laps, 'lap')}, ${finishers}.` : `${finishers}.`)
  const gains = rows
    .filter((x) => grid.has(x.driver))
    .map((x) => ({ x, gained: grid.get(x.driver)! - x.position }))
    .sort((a, b) => b.gained - a.gained)[0]
  if (gains && gains.gained > 0)
    intro.push(
      `${text(link(meta, gains.x.driver))} gained the most places, from ${ordinal(grid.get(gains.x.driver)!)} on the grid to ${ordinal(gains.x.position)}.`,
    )
  const neutral = replay && neutralisations(replay)
  if (neutral) intro.push(neutral)
  return {
    intro,
    table: {
      caption: `${meta.season} ${meta.event} race classification`,
      head: ['Pos', 'Driver', 'Team', 'Grid', 'Places', 'Laps', 'Gap'],
      rows: rows.map((x) => {
        const start = grid.get(x.driver)
        const moved = start == null ? '' : start - x.position
        return [
          String(x.position),
          link(meta, x.driver),
          teamOf(meta, x.driver),
          start == null ? '—' : String(start),
          moved === '' ? '' : moved > 0 ? `+${moved}` : String(moved),
          x.lapsCompleted == null ? '' : String(x.lapsCompleted),
          gapText(x),
        ]
      }),
    },
  }
}

export type SessionView = 'lap-duel' | 'strategy' | 'replay'

/** Links to the rest of the weekend, the race's archive page and the circuit. */
function weekendLinks(ctx: HistoryContext, s: SessionSummary, view: SessionView): SeoLinkGroup[] {
  const self = pathOf(view, [s.id])
  const weekend = sessionLinks(
    s.round == null ? [s] : (ctx.lookup.sessionsByRound.get(roundKey(s.season, s.round)) ?? [s]),
  ).filter((l) => l.href !== self)
  const race = s.round == null ? undefined : ctx.lookup.raceByRound.get(roundKey(s.season, s.round))
  const circuit = ctx.h.circuits.find((c) => c.id === s.circuitId)
  const more = [
    race != null && {
      text: `${s.season} ${s.event} results`,
      href: racePath(s.season, s.round!),
    },
    circuit && { text: `${circuit.name} circuit guide`, href: circuitPath(circuit.id) },
  ].filter((l): l is SeoLink => !!l)
  return [
    { title: 'This weekend', links: weekend },
    { title: 'More', links: more },
  ].filter((g) => g.links.length)
}

export function sessionContent(
  ctx: HistoryContext,
  s: SessionSummary,
  view: SessionView,
  detail: SeoSessionDetail | undefined,
): SeoContent {
  const related = weekendLinks(ctx, s, view)
  if (!detail) return { intro: [], tables: [], related }
  const { meta, replay } = detail
  const link = driverLinker(ctx, meta.season)
  const part =
    view === 'strategy' && replay
      ? strategyContent(meta, replay, link)
      : view === 'replay'
        ? replayContent(ctx, meta, replay, link)
        : meta.session === 'Race' || meta.session === 'Sprint'
          ? fastestLapContent(meta, link)
          : qualifyingContent(meta, link)
  return { intro: part.intro, tables: part.table.rows.length ? [part.table] : [], related }
}
