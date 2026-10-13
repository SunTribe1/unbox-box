import { formatLapTime, type HistoryIndex, type HistoryResults } from '@unbox-box/tools'
import {
  circuitPath,
  driverPath,
  type HistoryLookup,
  listOf,
  longDate,
  ordinal,
  plural,
  racePath,
  roundKey,
  type SeoCell,
  type SeoContent,
  type SeoLink,
  type SeoLinkGroup,
  sessionLinks,
  teamPath,
} from './content'

/** Summaries for the race archive, driver, team and circuit pages (F1DB history). */

export interface HistoryContext {
  h: HistoryIndex
  r: HistoryResults
  lookup: HistoryLookup
}

const raceName = (h: HistoryIndex, race: number) =>
  `${h.races.year[race]} ${h.races.name[race]} Grand Prix`

const raceLink = (h: HistoryIndex, race: number): SeoLink => ({
  text: raceName(h, race),
  href: racePath(h.races.year[race]!, h.races.round[race]!),
})

const points = (n: number) => String(Number(n.toFixed(1)))

export function driverCell({ h, lookup }: HistoryContext, driver: number): SeoCell {
  const d = h.drivers[driver]
  if (!d) return '—'
  return lookup.hasDriverPage(driver) ? { text: d.name, href: driverPath(d.id) } : d.name
}

export function teamCell({ h, lookup }: HistoryContext, team: number): SeoCell {
  const t = h.constructors[team]
  if (!t) return '—'
  return lookup.hasTeamPage(team) ? { text: t.name, href: teamPath(t.id) } : t.name
}

/** Classified finishers first, in order; then everyone else as listed. */
const byFinish = (r: HistoryResults) => (a: number, b: number) =>
  (r.pos[a]! || Infinity) - (r.pos[b]! || Infinity)

const resultText = (r: HistoryResults, row: number) =>
  r.status[row] || (r.pos[row]! > 0 ? 'Finished' : '—')

export function raceContent(ctx: HistoryContext, race: number): SeoContent {
  const { h, r, lookup } = ctx
  const year = h.races.year[race]!
  const round = h.races.round[race]!
  const rows = [...(lookup.rowsByRace[race] ?? [])].sort(byFinish(r))
  const circuit = h.circuits[h.races.circuit[race]!]
  const name = (row: number | undefined) => (row == null ? null : h.drivers[r.driver[row]!]?.name)
  const winner = rows.find((row) => r.pos[row] === 1)
  const pole = rows.find((row) => r.pole[row] === 1)
  const fastest = rows.find((row) => r.fastestLap[row] === 1)
  const classified = rows.filter((row) => r.pos[row]! > 0).length
  const laps = h.races.laps?.[race]

  const where = circuit ? ` at ${circuit.fullName ?? circuit.name}, ${circuit.place},` : ''
  const intro = [
    `The ${raceName(h, race)} was round ${round} of the ${year} Formula 1 World Championship, held${where} on ${longDate(h.races.date[race]!)}.`,
  ]
  if (winner != null) {
    const grid = r.grid[winner]!
    const from = grid > 0 ? ` from ${ordinal(grid)} on the grid` : ''
    intro.push(
      `${name(winner)} won for ${h.constructors[r.constructor[winner]!]?.name ?? 'their team'}${from}.`,
    )
  }
  const samePoleAndLap = pole != null && fastest != null && r.driver[pole] === r.driver[fastest]
  const extras = samePoleAndLap
    ? [`${name(pole)} started from pole position and set the fastest lap`]
    : [
        pole != null && `${name(pole)} started from pole position`,
        fastest != null && `${name(fastest)} set the fastest lap`,
      ].filter(Boolean)
  if (extras.length) intro.push(`${extras.join('; ')}.`)
  if (rows.length) {
    const distance = laps ? `The race ran over ${plural(laps, 'lap')}; ` : ''
    intro.push(`${distance}${classified} of ${rows.length} entries were classified.`.trimStart())
  }

  const previous = lookup.raceByRound.get(roundKey(year, round - 1))
  const next = lookup.raceByRound.get(roundKey(year, round + 1))
  const season = [
    previous != null && { ...raceLink(h, previous), text: `Previous: ${raceName(h, previous)}` },
    next != null && { ...raceLink(h, next), text: `Next: ${raceName(h, next)}` },
    circuit && { text: `${circuit.name} circuit guide`, href: circuitPath(circuit.id) },
  ].filter((l): l is SeoLink => !!l)
  const sessions = sessionLinks(lookup.sessionsByRound.get(roundKey(year, round)) ?? [])

  return {
    intro,
    tables: rows.length
      ? [
          {
            caption: `${raceName(h, race)} results`,
            head: ['Pos', 'Driver', 'Team', 'Grid', 'Result', 'Points'],
            rows: rows.map((row) => [
              r.pos[row]! > 0 ? String(r.pos[row]) : '—',
              driverCell(ctx, r.driver[row]!),
              teamCell(ctx, r.constructor[row]!),
              r.grid[row]! > 0 ? String(r.grid[row]) : '—',
              resultText(r, row),
              points(r.points[row]!),
            ]),
          },
        ]
      : [],
    related: [
      { title: `${year} season`, links: season },
      ...(sessions.length ? [{ title: 'Telemetry and analysis', links: sessions }] : []),
    ],
  }
}

interface SeasonLine {
  year: number
  names: string[]
  races: Set<number>
  wins: number
  podiums: number
  points: number
  best: number
}

/** One line per season for a driver's or a team's results rows. */
function seasons(
  { h, r }: HistoryContext,
  rows: number[],
  nameOf: (row: number) => string,
): SeasonLine[] {
  const byYear = new Map<number, SeasonLine>()
  for (const row of rows) {
    const race = r.race[row]!
    const year = h.races.year[race]!
    const line = byYear.get(year) ?? {
      year,
      names: [],
      races: new Set<number>(),
      wins: 0,
      podiums: 0,
      points: 0,
      best: Infinity,
    }
    const pos = r.pos[row]!
    const name = nameOf(row)
    byYear.set(year, {
      ...line,
      names: line.names.includes(name) ? line.names : [...line.names, name],
      races: new Set([...line.races, race]),
      wins: line.wins + (pos === 1 ? 1 : 0),
      podiums: line.podiums + (pos >= 1 && pos <= 3 ? 1 : 0),
      points: line.points + r.points[row]!,
      best: pos > 0 ? Math.min(line.best, pos) : line.best,
    })
  }
  return [...byYear.values()].sort((a, b) => b.year - a.year)
}

const seasonRow = (s: SeasonLine): SeoCell[] => [
  String(s.year),
  s.names.join(', '),
  String(s.races.size),
  String(s.wins),
  String(s.podiums),
  points(s.points),
  Number.isFinite(s.best) ? ordinal(s.best) : '—',
]

const SEASON_HEAD = ['Season', '', 'Races', 'Wins', 'Podiums', 'Points', 'Best finish']
const MAX_LINKS = 40

/** Wins as links, most recent first. */
function winLinks({ h, r }: HistoryContext, rows: number[]): SeoLink[] {
  return rows
    .filter((row) => r.pos[row] === 1)
    .map((row) => r.race[row]!)
    .sort((a, b) => b - a)
    .slice(0, MAX_LINKS)
    .map((race) => raceLink(h, race))
}

const span = (years: number[]) => {
  const from = Math.min(...years)
  const to = Math.max(...years)
  return from === to ? `in ${from}` : `from ${from} to ${to}`
}

export function driverContent(ctx: HistoryContext, driver: number): SeoContent {
  const { h, r, lookup } = ctx
  const d = h.drivers[driver]!
  const rows = [...(lookup.rowsByDriver.get(driver) ?? [])].sort((a, b) => r.race[a]! - r.race[b]!)
  const lines = seasons(ctx, rows, (row) => h.constructors[r.constructor[row]!]?.name ?? '—')
  const teams = [...new Set(rows.map((row) => r.constructor[row]!))]
  const teamNames = teams.map((t) => h.constructors[t]?.name ?? '—')

  const who = d.nationality ? `${d.fullName ?? d.name}, a ${d.nationality} driver,` : d.name
  const years = lines.map((l) => l.year)
  const intro = [
    years.length
      ? `${who} ${d.active ? 'has raced' : 'raced'} in Formula 1 ${span(years)}, driving for ${listOf(teamNames.slice(0, 6))}${teamNames.length > 6 ? ' and others' : ''}.`
      : `${who} entered Formula 1.`,
    `Career: ${plural(d.starts, 'start')}, ${plural(d.wins, 'win')}, ${plural(d.podiums, 'podium')}, ${plural(d.poles, 'pole position')}, ${plural(d.fastestLaps ?? 0, 'fastest lap')} and ${points(d.points ?? 0)} points.`,
  ]
  if (d.titles) intro.push(`${d.name} won the World Championship ${plural(d.titles, 'time')}.`)
  else if (d.bestChampionship)
    intro.push(`Best championship finish: ${ordinal(d.bestChampionship)}.`)

  const first = rows[0]
  const firstWin = rows.find((row) => r.pos[row] === 1)
  const milestones = [
    first != null && {
      ...raceLink(h, r.race[first]!),
      text: `First race: ${raceName(h, r.race[first]!)}`,
    },
    firstWin != null && {
      ...raceLink(h, r.race[firstWin]!),
      text: `First win: ${raceName(h, r.race[firstWin]!)}`,
    },
    rows.length > 1 && {
      ...raceLink(h, r.race[rows.at(-1)!]!),
      text: `${d.active ? 'Latest' : 'Last'} race: ${raceName(h, r.race[rows.at(-1)!]!)}`,
    },
  ].filter((l): l is SeoLink => !!l)
  const teamLinks = teams.flatMap((t) => {
    const cell = teamCell(ctx, t)
    return typeof cell === 'string' ? [] : [cell]
  })

  return {
    intro,
    tables: lines.length
      ? [
          {
            caption: `${d.name} season by season`,
            head: SEASON_HEAD.map((x) => x || 'Team'),
            rows: lines.map(seasonRow),
          },
        ]
      : [],
    related: [
      { title: 'Milestones', links: milestones },
      { title: 'Grand Prix wins', links: winLinks(ctx, rows) },
      { title: 'Teams', links: teamLinks },
    ].filter((g) => g.links.length),
  }
}

export function teamContent(ctx: HistoryContext, team: number): SeoContent {
  const { h, r, lookup } = ctx
  const t = h.constructors[team]!
  const rows = [...(lookup.rowsByTeam.get(team) ?? [])].sort((a, b) => r.race[a]! - r.race[b]!)
  const lines = seasons(ctx, rows, (row) => h.drivers[r.driver[row]!]?.name ?? '—')
  const name = t.fullName ?? t.name
  const years = lines.map((l) => l.year)
  const intro = [
    years.length
      ? `${name}${t.country ? `, a ${t.country} team,` : ''} raced in Formula 1 ${span(years)}.`
      : `${name} entered Formula 1.`,
    `Record: ${plural(t.starts ?? 0, 'start')}, ${plural(t.wins ?? 0, 'win')}, ${plural(t.podiums ?? 0, 'podium')}, ${plural(t.poles ?? 0, 'pole position')} and ${points(t.points ?? 0)} points.`,
  ]
  if (t.titles)
    intro.push(`${t.name} won the Constructors’ Championship ${plural(t.titles, 'time')}.`)

  // Drivers, most recent first.
  const drivers = [...new Set([...rows].reverse().map((row) => r.driver[row]!))]
  const driverLinks = drivers
    .flatMap((d) => {
      const cell = driverCell(ctx, d)
      return typeof cell === 'string' ? [] : [cell]
    })
    .slice(0, MAX_LINKS)

  return {
    intro,
    tables: lines.length
      ? [
          {
            caption: `${t.name} season by season`,
            head: SEASON_HEAD.map((x) => x || 'Drivers'),
            rows: lines.map(seasonRow),
          },
        ]
      : [],
    related: [
      { title: 'Drivers', links: driverLinks },
      { title: 'Grand Prix wins', links: winLinks(ctx, rows) },
    ].filter((g) => g.links.length),
  }
}

const CIRCUIT_TYPES: Record<string, string> = {
  RACE: 'permanent race circuit',
  STREET: 'street circuit',
  ROAD: 'road circuit',
}

export function circuitContent(ctx: HistoryContext, circuit: number): SeoContent {
  const { h, r, lookup } = ctx
  const c = h.circuits[circuit]!
  const races = [...(lookup.racesByCircuit.get(circuit) ?? [])].sort((a, b) => b - a)
  const winnerRow = (race: number) => lookup.rowsByRace[race]?.find((row) => r.pos[row] === 1)
  const poleRow = (race: number) => lookup.rowsByRace[race]?.find((row) => r.pole[row] === 1)

  const kind = (c.type && CIRCUIT_TYPES[c.type]) ?? 'circuit'
  const direction =
    c.direction === 'CLOCKWISE' ? ', run clockwise' : c.direction ? ', run anticlockwise' : ''
  const intro = [`${c.fullName ?? c.name} is a ${kind} in ${c.place}${direction}.`]
  const years = races.map((race) => h.races.year[race]!)
  if (races.length)
    intro.push(
      `It has hosted ${plural(races.length, 'Formula 1 World Championship race')} ${span(years)}.`,
    )
  if (c.length && c.turns)
    intro.push(`The latest layout is ${c.length} km long with ${plural(c.turns, 'turn')}.`)
  if (c.layouts.length > 1) intro.push(`Formula 1 has raced on ${c.layouts.length} layouts here.`)
  const record = h.lapRecords.find((l) => l.circuit === circuit && l.current)
  if (record)
    intro.push(
      `The race lap record is ${formatLapTime(record.time)}, set by ${h.drivers[record.driver]?.name} in ${record.year}.`,
    )
  const wins = new Map<number, number>()
  for (const race of races) {
    const row = winnerRow(race)
    if (row != null) wins.set(r.driver[row]!, (wins.get(r.driver[row]!) ?? 0) + 1)
  }
  const [top, count] = [...wins].sort((a, b) => b[1] - a[1])[0] ?? []
  if (top != null && count && count > 1)
    intro.push(`${h.drivers[top]?.name} has won here most often, ${plural(count, 'time')}.`)

  const recentSessions = races
    .slice(0, 4)
    .flatMap((race) =>
      sessionLinks(
        lookup.sessionsByRound.get(roundKey(h.races.year[race]!, h.races.round[race]!)) ?? [],
      ).map((l) => ({ ...l, text: `${h.races.year[race]} ${l.text}` })),
    )

  return {
    intro,
    tables: races.length
      ? [
          {
            caption: `Formula 1 winners at ${c.name}`,
            head: ['Year', 'Grand Prix', 'Winner', 'Team', 'Pole'],
            rows: races.map((race) => {
              const w = winnerRow(race)
              const p = poleRow(race)
              return [
                { text: String(h.races.year[race]), href: raceLink(h, race).href },
                `${h.races.name[race]} Grand Prix`,
                w == null ? '—' : driverCell(ctx, r.driver[w]!),
                w == null ? '—' : teamCell(ctx, r.constructor[w]!),
                p == null ? '—' : driverCell(ctx, r.driver[p]!),
              ]
            }),
          },
        ]
      : [],
    related: recentSessions.length
      ? [{ title: 'Telemetry from recent races', links: recentSessions }]
      : ([] as SeoLinkGroup[]),
  }
}
