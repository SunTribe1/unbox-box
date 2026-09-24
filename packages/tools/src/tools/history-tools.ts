import '../zod-setup'
import { z } from 'zod'
import {
  careerBySeason,
  circuitWinners,
  headToHead,
  historicDriver,
  ranking,
  resolveCircuit,
  resolveHistoricDriver,
  STAT_LABELS,
  STATS,
} from '../analysis/history'
import { defineTool, type UnboxBoxContext } from './types'

/** Record Book board ids for the ranking stats. */
const BOARD_FOR_STAT: Record<(typeof STATS)[number], string> = {
  wins: 'wins',
  podiums: 'podiums',
  poles: 'poles',
  fastestLaps: 'fastest-laps',
  starts: 'starts',
  points: 'points',
  titles: 'titles',
}

async function openHistory(ctx: UnboxBoxContext) {
  ctx.commands.openView('history')
  return ctx.getHistory()
}

const years = (first: number | null, last: number | null) =>
  first == null ? '' : first === last ? `${first}` : `${first}–${last}`

const headToHeadTool = defineTool({
  name: 'head_to_head',
  title: 'Head to head',
  description:
    'Compares two drivers from any era (1950 to present): career totals, and in races they both started who finished and started ahead, including as teammates. Opens the History Explorer.',
  input: z.object({
    driverA: z.string().describe('Any F1 driver, e.g. "Senna", "Michael Schumacher", "VER".'),
    driverB: z.string(),
  }),
  readOnly: false,
  async execute({ driverA, driverB }, ctx) {
    const data = await openHistory(ctx)
    const a = resolveHistoricDriver(data, driverA)
    const b = resolveHistoricDriver(data, driverB)
    const h = headToHead(data, a, b)
    ctx.commands.setHistory({ a: h.a.id, b: h.b.id })
    const totals = (d: typeof h.a) =>
      `${d.name}: ${d.titles} title${d.titles === 1 ? '' : 's'}, ${d.wins} wins, ${d.poles} poles, ${d.podiums} podiums from ${d.starts} starts (${years(d.firstYear, d.lastYear)})`
    const lines = [totals(h.a), totals(h.b)]
    if (h.together) {
      lines.push(
        `In ${h.together} races together (${years(h.firstShared, h.lastShared)}), ${h.a.lastName} finished ahead ${h.finishedAhead.a} times and ${h.b.lastName} ${h.finishedAhead.b}.`,
      )
      if (h.teammateRaces) {
        lines.push(
          `As teammates (${h.teammateRaces} races): ${h.a.lastName} ${h.teammateAhead.a}–${h.teammateAhead.b} ${h.b.lastName}.`,
        )
      }
    } else {
      lines.push('They never raced against each other.')
    }
    return {
      text: lines.join('\n'),
      data: h,
      effect: `History → ${h.a.lastName} vs ${h.b.lastName}`,
    }
  },
})

const queryHistory = defineTool({
  name: 'query_history',
  title: 'All-time records',
  description:
    'All-time leaderboard for wins, podiums, poles, fastest laps, starts, points or championships, optionally limited to a range of years or one circuit. Opens the Record Book (or the circuit page for one circuit).',
  input: z.object({
    stat: z.enum(STATS),
    from: z.number().int().min(1950).optional(),
    to: z.number().int().optional(),
    circuit: z.string().optional().describe('Circuit name or place, e.g. "Monza".'),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  readOnly: false,
  async execute({ stat, from, to, circuit, limit }, ctx) {
    const data = await ctx.getHistory()
    const circuitIdx = circuit ? resolveCircuit(data, circuit) : undefined
    const rows = ranking(data, stat, { from, to, circuit: circuitIdx }, limit)
    // A circuit's records live on its page; everything else in the Record Book.
    if (circuitIdx != null) {
      ctx.commands.setCircuit(data.index.circuits[circuitIdx]!.id)
      ctx.commands.openView('circuits')
    } else {
      ctx.commands.setArchive({
        scope: 'drivers',
        board: BOARD_FOR_STAT[stat],
        era: from || to ? `${from ?? 1950}-${to ?? data.index.latestSeason}` : 'all',
      })
      ctx.commands.openView('records')
    }
    const scope = [
      circuitIdx != null ? `at ${data.index.circuits[circuitIdx]!.name}` : '',
      from && to ? `${from}–${to}` : from ? `since ${from}` : to ? `until ${to}` : 'all time',
    ]
      .filter(Boolean)
      .join(', ')
    const fmt = (v: number) => (stat === 'points' ? v.toFixed(v % 1 ? 1 : 0) : String(v))
    return {
      text: `${STAT_LABELS[stat]} (${scope}):\n${rows
        .map((r, i) => `${i + 1}. ${historicDriver(data, r.driver).name} ${fmt(r.value)}`)
        .join('\n')}`,
      data: rows.map((r) => ({ driver: historicDriver(data, r.driver).name, value: r.value })),
      effect: `Records → ${STAT_LABELS[stat].toLowerCase()}`,
    }
  },
})

const getDriverCareer = defineTool({
  name: 'get_driver_career',
  title: 'Driver career',
  description: "A driver's career: totals, seasons, titles and their best season by wins.",
  input: z.object({ driver: z.string() }),
  readOnly: true,
  async execute({ driver }, ctx) {
    const data = await ctx.getHistory()
    const i = resolveHistoricDriver(data, driver)
    const d = historicDriver(data, i)
    const seasons = careerBySeason(data, i)
    const best = [...seasons].sort((x, y) => y.wins - x.wins || y.points - x.points)[0]
    const titles = seasons.filter((s) => s.champion).map((s) => s.year)
    const lines = [
      `${d.name}${d.nationality ? ` (${d.nationality})` : ''}: ${seasons.length} seasons (${years(d.firstYear, d.lastYear)}), ${d.starts} starts, ${d.wins} wins, ${d.podiums} podiums, ${d.poles} poles, ${d.fastestLaps} fastest laps.`,
      titles.length ? `World champion ${titles.join(', ')}.` : 'No world titles.',
    ]
    if (best && best.wins) lines.push(`Best season by wins: ${best.year} with ${best.wins}.`)
    return { text: lines.join(' '), data: { driver: d, seasons } }
  },
})

const circuitHistory = defineTool({
  name: 'circuit_history',
  title: 'Circuit history',
  description:
    'Past winners at a circuit (defaults to the current session’s circuit) and the drivers with the most wins there.',
  input: z.object({
    circuit: z.string().optional(),
    limit: z.number().int().min(1).max(30).default(8),
  }),
  readOnly: false,
  async execute({ circuit, limit }, ctx) {
    const data = await ctx.getHistory()
    const name = circuit ?? (await ctx.getSession()).circuit.slug
    const idx = resolveCircuit(data, name)
    const winners = circuitWinners(data, idx)
    const top = ranking(data, 'wins', { circuit: idx }, 3)
    ctx.commands.setCircuit(data.index.circuits[idx]!.id)
    ctx.commands.openView('circuits')
    const c = data.index.circuits[idx]!
    return {
      text: [
        `${c.name}: ${winners.length} Grands Prix.`,
        `Most wins: ${top.map((t) => `${historicDriver(data, t.driver).name} ${t.value}`).join(', ')}.`,
        `Recent winners: ${winners
          .slice(0, limit)
          .map((w) => `${w.year} ${historicDriver(data, w.driver).lastName} (${w.constructor})`)
          .join(', ')}.`,
      ].join(' '),
      data: winners.slice(0, limit),
      effect: `History → ${c.name}`,
    }
  },
})

export const historyTools = [headToHeadTool, queryHistory, getDriverCareer, circuitHistory] as const
