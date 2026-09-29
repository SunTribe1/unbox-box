import type { HistoryIndex, HistoryResults, SessionSummary, View } from '@unbox-box/tools'
import { VIEW_SLUG } from '../routes'
import { breadcrumbs, type JsonLd, personLd, placeLd, sportsEventLd, teamLd } from './json-ld'

/**
 * One prerendered page per race weekend, driver, team, circuit and session, so each can be
 * found by what people search for ("1988 Monaco Grand Prix results", "Alain Prost stats").
 * Every page is the same app; the path picks what it shows. Built from the data at build
 * time; pure, so it is unit-tested with fixtures.
 */

export interface SeoSource {
  sessions: SessionSummary[]
  history: HistoryIndex
  results: HistoryResults
}

export interface SeoPage {
  view: View
  /** Path segments after the view's slug, e.g. ['1988', '3']. */
  segments: string[]
  /** '/races/1988/3/' */
  path: string
  /** The visible page title, without the site name. */
  heading: string
  description: string
  /** Last change, for the sitemap (ISO date). */
  date?: string
  jsonLd: JsonLd[]
}

const SITE_NAME = 'Unbox Box'

const pathOf = (view: View, segments: string[]) => `/${[VIEW_SLUG[view], ...segments].join('/')}/`

function page(
  view: View,
  segments: string[],
  heading: string,
  description: string,
  entity: JsonLd | null,
  viewTitle: string,
  date?: string,
): SeoPage {
  const path = pathOf(view, segments)
  const trail = breadcrumbs([
    { name: SITE_NAME, path: '/' },
    { name: viewTitle, path: pathOf(view, []) },
    { name: heading, path },
  ])
  return {
    view,
    segments,
    path,
    heading,
    description,
    ...(date && { date }),
    jsonLd: entity ? [entity, trail] : [trail],
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const years = (from: number | null, to: number | null) =>
  from == null ? '' : from === to || to == null ? `${from}` : `${from}–${to}`

/** Winner and pole sitter of each race, by the race's row in the history index. */
function podiumHeads(results: HistoryResults) {
  const winner = new Map<number, { driver: number; team: number }>()
  const pole = new Map<number, number>()
  results.race.forEach((race, i) => {
    if (results.pos[i] === 1)
      winner.set(race, { driver: results.driver[i]!, team: results.constructor[i]! })
    if (results.pole[i] === 1) pole.set(race, results.driver[i]!)
  })
  return { winner, pole }
}

export function racePages({ history: h, results }: SeoSource): SeoPage[] {
  const { winner, pole } = podiumHeads(results)
  const r = h.races
  return r.year.map((year, i) => {
    const round = r.round[i]!
    const name = `${year} ${r.name[i]} Grand Prix`
    const circuit = h.circuits[r.circuit[i]!]
    const w = winner.get(i)
    const p = pole.get(i)
    const facts = [
      w && `Won by ${h.drivers[w.driver]?.name} (${h.constructors[w.team]?.name})`,
      p != null && `pole: ${h.drivers[p]?.name}`,
    ].filter(Boolean)
    const where = circuit ? ` at ${circuit.fullName ?? circuit.name}` : ''
    const description = `Results, qualifying, starting grid and pit stops from the ${name}${where}, round ${round}.${facts.length ? ` ${facts.join('; ')}.` : ''}`
    return page(
      'races',
      [String(year), String(round)],
      `${name} results`,
      description,
      sportsEventLd({
        name,
        date: r.date[i]!,
        path: pathOf('races', [String(year), String(round)]),
        circuit,
      }),
      // No sitemap date: <lastmod> is when the page last changed, not when the race ran, and
      // search engines reject dates before 1970.
      'Race Archive',
    )
  })
}

export function driverPages({ history: h }: SeoSource): SeoPage[] {
  return h.drivers
    .filter((d) => d.starts > 0)
    .map((d) => {
      const span = years(d.firstYear, d.lastYear)
      const titles = d.titles ? `, ${plural(d.titles, 'world title')}` : ''
      const description = `${d.name}'s Formula 1 career${span ? ` (${span})` : ''}: ${plural(d.starts, 'start')}, ${plural(d.wins, 'win')}, ${plural(d.podiums, 'podium')}, ${plural(d.poles, 'pole')}${titles}. Season-by-season results, teammates and head-to-heads.`
      const segments = ['drivers', d.id]
      return page(
        'history',
        segments,
        `${d.name} F1 career stats`,
        description,
        personLd(d, pathOf('history', segments)),
        'History Explorer',
      )
    })
}

export function teamPages({ history: h }: SeoSource): SeoPage[] {
  return h.constructors
    .filter((t) => (t.starts ?? 0) > 0)
    .map((t) => {
      const titles = t.titles ? `, ${plural(t.titles, 'constructors’ title')}` : ''
      const description = `${t.fullName ?? t.name} in Formula 1: ${plural(t.starts ?? 0, 'start')}, ${plural(t.wins ?? 0, 'win')}, ${plural(t.podiums ?? 0, 'podium')}, ${plural(t.poles ?? 0, 'pole')}${titles}. Drivers, seasons, engines and every name the team raced under.`
      const segments = ['teams', t.id]
      return page(
        'history',
        segments,
        `${t.name} F1 team history and stats`,
        description,
        teamLd(t, pathOf('history', segments)),
        'History Explorer',
      )
    })
}

export function circuitPages({ history: h }: SeoSource): SeoPage[] {
  return h.circuits.map((c) => {
    const size = [c.length && `${c.length} km`, c.turns && plural(c.turns, 'turn')]
      .filter(Boolean)
      .join(', ')
    const description = `${c.fullName ?? c.name} in ${c.place}${size ? ` (${size})` : ''}: track layouts, corners, the lap record and every Formula 1 winner here.`
    return page(
      'circuits',
      [c.id],
      `${c.fullName ?? c.name}: F1 circuit guide`,
      description,
      placeLd(c, pathOf('circuits', [c.id])),
      'Circuits',
    )
  })
}

/** Telemetry for every session, plus strategy and a replay for each race. */
export function sessionPages({ sessions }: SeoSource): SeoPage[] {
  return sessions.flatMap((s) => {
    const event = `${s.season} ${s.event}`
    const date = s.date ?? undefined
    const about = sportsEventLd({ name: event, date: s.date, path: null, circuitName: s.circuit })
    const duel = page(
      'lap-duel',
      [s.id],
      `${event} ${s.session} telemetry: lap comparison`,
      `F1 telemetry analysis for the ${event} ${s.session.toLowerCase()} at ${s.circuit}: compare any two laps corner by corner, with speed, throttle, brake, gear and the running gap.`,
      about,
      'Lap Duel',
      date,
    )
    if (s.session !== 'Race') return [duel]
    return [
      duel,
      page(
        'strategy',
        [s.id],
        `${event} tyre strategy and pit stops`,
        `Tyre strategy for the ${event}: every stint, pit stop and compound, tyre degradation, undercuts and a race simulator to test other strategies.`,
        about,
        'Strategy Lab',
        date,
      ),
      page(
        'replay',
        [s.id],
        `${event} race replay`,
        `Replay the ${event} lap by lap on the track map, with a live timing tower, gaps, pit stops and race control messages.`,
        about,
        'Race Replay',
        date,
      ),
    ]
  })
}

export function seoPages(source: SeoSource): SeoPage[] {
  return [
    ...sessionPages(source),
    ...racePages(source),
    ...driverPages(source),
    ...teamPages(source),
    ...circuitPages(source),
  ]
}
