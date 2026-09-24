import '../zod-setup'
import { z } from 'zod'
import {
  compareSections,
  lapStats,
  sectionForCorner,
  type SectionComparison,
} from '../analysis/lap'
import { formatGap, formatLapTime, formatSeconds, ordinal } from '../analysis/format'
import { driverName, findResult, resolveCorner, resolveDriver, resolveLap } from '../data/lookup'
import type { SessionMeta } from '../data/schema'
import { groupSessions, matchSessions } from '../data/sessions'
import { ensureRace, replayTools } from './replay-tools'
import { strategyTools } from './strategy-tools'
import { historyTools } from './history-tools'
import { profileTools } from './profile-tools'
import { TRACES, VIEWS, defineTool, type UnboxBoxContext, type ToolDefinition } from './types'

const lapRef = z
  .union([z.number().int().positive(), z.enum(['best', 'Q1', 'Q2', 'Q3'])])
  .describe('Lap number, "best" (the classified lap) or a qualifying segment (Q1/Q2/Q3).')

const driverRef = z
  .string()
  .min(1)
  .describe('Driver code (VER), last name (Verstappen), first name or car number.')

async function duelContext(ctx: UnboxBoxContext) {
  const state = ctx.getState()
  const meta = await ctx.getSession()
  const { a, b, lapA, lapB } = state.duel
  const [telA, telB] = await Promise.all([
    ctx.getTelemetry(meta.id, a, lapA),
    ctx.getTelemetry(meta.id, b, lapB),
  ])
  const lapTimeA = meta.laps[a]?.find((l) => l.lap === lapA)?.time ?? null
  const lapTimeB = meta.laps[b]?.find((l) => l.lap === lapB)?.time ?? null
  return { meta, state, telA, telB, lapTimes: { a: lapTimeA, b: lapTimeB } }
}

function describeSection(meta: SessionMeta, c: SectionComparison, a: string, b: string): string {
  const who = c.delta > 0 ? a : b
  return `${c.section.name} (${c.section.turns}): ${who} ${formatSeconds(Math.abs(c.delta))} quicker`
}

const MAX_LISTED = 12

const sessionLine = (s: { season: number; event: string; session: string; id: string }) =>
  `${s.season} ${s.event} · ${s.session} (${s.id})`

const listSessions = defineTool({
  name: 'list_sessions',
  title: 'List sessions',
  description:
    'Summarises the data available: sessions per season and the most recent sessions. Use find_session to search by season, event or session type.',
  input: z.object({}),
  readOnly: true,
  async execute(_input, ctx) {
    const sessions = await ctx.listSessions()
    const seasons = groupSessions(sessions).map(
      (g) =>
        `${g.season}: ${g.events.length} events, ${g.events.reduce((n, e) => n + e.sessions.length, 0)} sessions`,
    )
    const latest = sessions.slice(0, MAX_LISTED).map(sessionLine)
    return {
      text: [`Data available:`, ...seasons, '', 'Most recent:', ...latest].join('\n'),
      data: { seasons, latest: sessions.slice(0, MAX_LISTED) },
    }
  },
})

const findSessionTool = defineTool({
  name: 'find_session',
  title: 'Find session',
  description:
    'Finds sessions by season, event and session type, newest first. Event accepts names, nicknames, circuits or countries (e.g. "Monaco", "COTA", "Interlagos", "Brazil"). Session is Qualifying, Race, Sprint or Sprint Qualifying. Pass a result id to load_session.',
  input: z.object({
    season: z.number().int().min(1950).optional().describe('Championship year, e.g. 2024'),
    event: z.string().min(2).optional().describe('Event, circuit, city or country'),
    session: z.string().optional().describe('Qualifying, Race, Sprint or Sprint Qualifying'),
  }),
  readOnly: true,
  async execute(query, ctx) {
    const found = matchSessions(await ctx.listSessions(), query)
    if (!found.length) {
      return {
        text: 'No sessions match. Try list_sessions to see what data is available.',
        data: [],
      }
    }
    const shown = found.slice(0, MAX_LISTED)
    const more = found.length > shown.length ? `\n…and ${found.length - shown.length} more.` : ''
    return { text: shown.map(sessionLine).join('\n') + more, data: shown }
  },
})

const loadSession = defineTool({
  name: 'load_session',
  title: 'Load session',
  description:
    'Loads a session (id from find_session or list_sessions) and makes it the current context.',
  input: z.object({ sessionId: z.string().describe('Session id, e.g. 2025-italian-grand-prix-q') }),
  readOnly: false,
  async execute({ sessionId }, ctx) {
    const sessions = await ctx.listSessions()
    const found = sessions.find((s) => s.id === sessionId)
    if (!found) throw new Error(`Unknown session "${sessionId}". Try find_session.`)
    await ctx.commands.loadSession(sessionId)
    return {
      text: `Loaded ${found.season} ${found.event} ${found.session}.`,
      effect: `Session → ${found.season} ${found.event} ${found.session}`,
    }
  },
})

const openView = defineTool({
  name: 'open_view',
  title: 'Open view',
  description:
    'Switches the main view: lap-duel (compare two laps), replay (race replay), strategy (tyre strategy lab), history (head-to-heads, driver and team profiles), races (every weekend since 1950), circuits, records (leaderboards), engines (engine and tyre makers), nations, or help. Replay and strategy load the race of the current event if needed.',
  input: z.object({ view: z.enum(VIEWS) }),
  readOnly: false,
  async execute({ view }, ctx) {
    if (view === 'replay' || view === 'strategy') {
      const { note } = await ensureRace(ctx, view)
      const label = view === 'replay' ? 'Race Replay' : 'Strategy Lab'
      return {
        text: [note, `Opened ${label}.`].filter(Boolean).join(' '),
        effect: `View → ${label}`,
      }
    }
    ctx.commands.openView(view)
    const label = view === 'history' ? 'History Explorer' : 'Lap Duel'
    return { text: `Opened ${label}.`, effect: `View → ${label}` }
  },
})

const getResults = defineTool({
  name: 'get_results',
  title: 'Get results',
  description:
    'Session classification, or a ranking by best sector time or speed-trap speed on each driver’s classified lap.',
  input: z.object({
    metric: z.enum(['lap', 's1', 's2', 's3', 'speedTrap']).default('lap'),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  readOnly: true,
  async execute({ metric, limit }, ctx) {
    const meta = await ctx.getSession()
    const rows = meta.results
      .filter((r) => r[metric === 'lap' ? 'time' : metric] != null)
      .map((r) => ({ ...r, value: (metric === 'lap' ? r.time : r[metric]) as number }))
    if (metric !== 'lap') {
      rows.sort((x, y) => (metric === 'speedTrap' ? y.value - x.value : x.value - y.value))
    }
    const top = rows.slice(0, limit)
    const label =
      metric === 'lap'
        ? 'Classification'
        : metric === 'speedTrap'
          ? 'Speed trap on classified laps'
          : `Fastest ${metric.toUpperCase()}`
    const lines = top.map((r, i) => {
      const rank = metric === 'lap' ? r.position : i + 1
      const value = metric === 'speedTrap' ? `${Math.round(r.value)} km/h` : formatLapTime(r.value)
      return `${rank}. ${r.driver} ${value}`
    })
    return { text: `${label}:\n${lines.join('\n')}`, data: top }
  },
})

const compareLaps = defineTool({
  name: 'compare_laps',
  title: 'Compare laps',
  description:
    'Opens Lap Duel with two laps overlaid (speed, throttle, brake, gear, RPM and the running time delta). Defaults to each driver’s classified lap.',
  input: z.object({
    driverA: driverRef,
    driverB: driverRef,
    lapA: lapRef.optional(),
    lapB: lapRef.optional(),
  }),
  readOnly: false,
  async execute(input, ctx) {
    const meta = await ctx.getSession()
    const a = resolveDriver(meta, input.driverA)
    const b = resolveDriver(meta, input.driverB)
    const lapA = resolveLap(meta, a.code, input.lapA ?? 'best')
    const lapB = resolveLap(meta, b.code, input.lapB ?? 'best')
    ctx.commands.openView('lap-duel')
    ctx.commands.setDuel({ a: a.code, b: b.code, lapA: lapA.lap, lapB: lapB.lap })
    const gap = (lapB.time ?? 0) - (lapA.time ?? 0)
    return {
      text: `${a.code} ${formatLapTime(lapA.time)} (lap ${lapA.lap}) vs ${b.code} ${formatLapTime(lapB.time)} (lap ${lapB.lap}): ${b.code} ${formatGap(gap)}s.`,
      data: { a: a.code, b: b.code, lapA: lapA.lap, lapB: lapB.lap, gap },
      effect: `Lap Duel → ${a.code} L${lapA.lap} vs ${b.code} L${lapB.lap}`,
    }
  },
})

const explainGap = defineTool({
  name: 'explain_gap',
  title: 'Explain gap',
  description:
    'Explains where the two laps in Lap Duel differ: time won or lost in each corner section, minimum speeds and braking points. Highlights the section with the biggest difference.',
  input: z.object({}),
  readOnly: false,
  async execute(_input, ctx) {
    const { meta, state, telA, telB, lapTimes } = await duelContext(ctx)
    const { a, b } = state.duel
    const sections = compareSections(meta, telA, telB, lapTimes)
    const total = (lapTimes.b ?? 0) - (lapTimes.a ?? 0)
    const faster = total >= 0 ? a : b
    const slower = faster === a ? b : a
    // Sections where the slower driver lost the most (sign relative to the faster driver).
    const signed = sections.map((s) => ({ s, lossForSlower: faster === a ? s.delta : -s.delta }))
    const losses = signed
      .filter((x) => x.lossForSlower > 0.005)
      .sort((x, y) => y.lossForSlower - x.lossForSlower)
    const gains = signed
      .filter((x) => x.lossForSlower < -0.005)
      .sort((x, y) => x.lossForSlower - y.lossForSlower)
    const worst = losses[0]?.s
    if (worst) ctx.commands.highlightCorner(worst.section.corners[0] ?? null)

    const lines = [
      `${driverName(meta, slower)} was ${formatSeconds(Math.abs(total))} slower than ${driverName(meta, faster)}.`,
    ]
    if (losses.length) {
      lines.push(
        `Biggest losses: ${losses
          .slice(0, 3)
          .map(
            (x) => `${x.s.section.name} (${x.s.section.turns}) ${formatSeconds(x.lossForSlower)}`,
          )
          .join(', ')}.`,
      )
    }
    if (gains.length) {
      lines.push(
        `${slower} was quicker at ${gains
          .slice(0, 2)
          .map((x) => `${x.s.section.name} (${formatSeconds(-x.lossForSlower)})`)
          .join(' and ')}.`,
      )
    }
    if (worst) {
      const ms = worst.minSpeed
      lines.push(
        `At ${worst.section.name}, minimum speed was ${a} ${Math.round(ms.a)} vs ${b} ${Math.round(ms.b)} km/h.`,
      )
    }
    return {
      text: lines.join(' '),
      data: sections.map((s) => ({
        section: s.section.name,
        turns: s.section.turns,
        delta: Number(s.delta.toFixed(3)),
        minSpeed: s.minSpeed,
        brakePoint: s.brakePoint,
      })),
      effect: worst ? `Highlighted ${worst.section.name} (${worst.section.turns})` : undefined,
    }
  },
})

const highlightCorner = defineTool({
  name: 'highlight_corner',
  title: 'Highlight corner',
  description:
    'Highlights a corner on the track map and telemetry charts. Accepts a number (11), "T11" or a name ("Parabolica"). Pass null to clear.',
  input: z.object({ corner: z.union([z.string(), z.number().int(), z.null()]) }),
  readOnly: false,
  async execute({ corner }, ctx) {
    if (corner === null) {
      ctx.commands.highlightCorner(null)
      return { text: 'Cleared the corner highlight.', effect: 'Highlight cleared' }
    }
    const meta = await ctx.getSession()
    const number = resolveCorner(meta, corner)
    const section = sectionForCorner(meta, number)
    ctx.commands.highlightCorner(number)
    const label = section ? `${section.name} (${section.turns})` : `Turn ${number}`
    return {
      text: `Highlighted ${label}.`,
      data: { corner: number },
      effect: `Highlighted ${label}`,
    }
  },
})

const cornerReport = defineTool({
  name: 'corner_report',
  title: 'Corner report',
  description:
    'For the two laps in Lap Duel: time difference, minimum speed and braking point in one corner section.',
  input: z.object({ corner: z.union([z.string(), z.number().int()]) }),
  readOnly: true,
  async execute({ corner }, ctx) {
    const { meta, state, telA, telB, lapTimes } = await duelContext(ctx)
    const number = resolveCorner(meta, corner)
    const comparison = compareSections(meta, telA, telB, lapTimes).find((c) =>
      c.section.corners.includes(number),
    )
    if (!comparison) throw new Error(`No section found for turn ${number}.`)
    const { a, b } = state.duel
    const bp = comparison.brakePoint
    const brakeText =
      bp.a != null && bp.b != null
        ? ` ${bp.a < bp.b ? a : b} braked ${Math.abs(bp.a - bp.b).toFixed(0)} m earlier.`
        : ''
    return {
      text: `${describeSection(meta, comparison, a, b)}. Minimum speed ${a} ${Math.round(comparison.minSpeed.a)} vs ${b} ${Math.round(comparison.minSpeed.b)} km/h.${brakeText}`,
      data: comparison,
    }
  },
})

const setTraces = defineTool({
  name: 'set_traces',
  title: 'Set traces',
  description: 'Chooses which telemetry traces Lap Duel shows.',
  input: z.object({ traces: z.array(z.enum(TRACES)).min(1) }),
  readOnly: false,
  async execute({ traces }, ctx) {
    ctx.commands.setTraces(traces)
    return { text: `Showing ${traces.join(', ')}.`, effect: `Traces → ${traces.join(', ')}` }
  },
})

const getLapStats = defineTool({
  name: 'get_lap_stats',
  title: 'Lap stats',
  description:
    'Top speed, minimum speed and the share of the lap at full throttle, on the brakes and with DRS open.',
  input: z.object({ driver: driverRef, lap: lapRef.optional() }),
  readOnly: true,
  async execute({ driver, lap }, ctx) {
    const meta = await ctx.getSession()
    const d = resolveDriver(meta, driver)
    const l = resolveLap(meta, d.code, lap ?? 'best')
    const stats = lapStats(await ctx.getTelemetry(meta.id, d.code, l.lap))
    const pct = (x: number) => `${Math.round(x * 100)}%`
    const position = findResult(meta, d.code)?.position
    return {
      text: `${d.code} lap ${l.lap} (${formatLapTime(l.time)}${position ? `, ${ordinal(position)}` : ''}): top speed ${stats.topSpeed} km/h, slowest point ${stats.minSpeed} km/h, full throttle ${pct(stats.fullThrottle)}, braking ${pct(stats.braking)}, DRS ${pct(stats.drs)} of the lap.`,
      data: stats,
    }
  },
})

export const tools = [
  listSessions,
  findSessionTool,
  loadSession,
  openView,
  getResults,
  compareLaps,
  explainGap,
  highlightCorner,
  cornerReport,
  setTraces,
  getLapStats,
  ...replayTools,
  ...strategyTools,
  ...historyTools,
  ...profileTools,
] as const satisfies readonly ToolDefinition[]

export type ToolName = (typeof tools)[number]['name']

export function getTool(name: string): ToolDefinition | undefined {
  return (tools as readonly ToolDefinition[]).find((t) => t.name === name)
}

/** JSON Schema for a tool's input, for WebMCP, the Claude API and MCP. */
export function inputJsonSchema(tool: ToolDefinition): Record<string, unknown> {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(tool.input, { io: 'input' }) as Record<
    string,
    unknown
  >
  return schema
}
