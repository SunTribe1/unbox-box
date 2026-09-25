import '../zod-setup'
import { z } from 'zod'
import { formatInterval, formatRaceTime, standingsAt, timeOfLap } from '../analysis/replay'
import { resolveDriver } from '../data/lookup'
import { PLAYBACK_SPEEDS, defineTool, type UnboxBoxContext } from './types'

/** Makes sure a race session is loaded and a race view (replay or strategy) is open. When
 *  the current session isn't a race, loads the race from the same event. */
export async function ensureRace(
  ctx: UnboxBoxContext,
  view: 'replay' | 'strategy' = 'replay',
): Promise<{ sessionId: string; note?: string | undefined }> {
  let meta = await ctx.getSession()
  let note: string | undefined
  if (!meta.replay) {
    const sessions = await ctx.listSessions()
    const race = sessions.find(
      (s) =>
        s.season === meta.season && s.event === meta.event && s.session.toLowerCase() === 'race',
    )
    if (!race) throw new Error(`There's no race data for the ${meta.season} ${meta.event} yet.`)
    await ctx.commands.loadSession(race.id)
    meta = await ctx.getSession(race.id)
    note = `Loaded the ${meta.event} race.`
  }
  ctx.commands.openView(view)
  return { sessionId: meta.id, note }
}

export const ensureReplay = (ctx: UnboxBoxContext) => ensureRace(ctx, 'replay')

async function snapshot(ctx: UnboxBoxContext, sessionId: string, t: number, limit = 3) {
  const replay = await ctx.getReplay(sessionId)
  const table = standingsAt(replay, t)
  const lap = Math.min(replay.totalLaps, Math.floor(table[0]?.progress ?? 0) + 1)
  const top = table
    .slice(0, limit)
    .map((s, i) => (i === 0 ? `${s.driver} leads` : `${s.driver} ${formatInterval(s.gap)}`))
    .join(', ')
  return {
    replay,
    table,
    lap,
    text: `Lap ${lap}/${replay.totalLaps} (${formatRaceTime(t)}): ${top}.`,
  }
}

const replaySeek = defineTool({
  name: 'replay_seek',
  title: 'Seek race replay',
  description:
    'Opens the race replay and jumps to a lap (the moment the leader starts it), a race time in seconds, the start or the finish. Loads the race of the current event if needed.',
  input: z.object({
    lap: z.number().int().positive().optional(),
    seconds: z.number().min(0).optional(),
    moment: z.enum(['start', 'finish']).optional(),
  }),
  readOnly: false,
  async execute({ lap, seconds, moment }, ctx) {
    const { sessionId, note } = await ensureReplay(ctx)
    const replay = await ctx.getReplay(sessionId)
    const t =
      moment === 'start'
        ? 0
        : moment === 'finish'
          ? (replay.classification[0]?.time ?? replay.duration)
          : lap != null
            ? timeOfLap(replay, lap)
            : (seconds ?? ctx.getState().playback.time)
    ctx.commands.seekReplay(Math.min(t, replay.duration))
    const snap = await snapshot(ctx, sessionId, t)
    return {
      text: [note, snap.text].filter(Boolean).join(' '),
      data: { time: t, lap: snap.lap },
      effect: `Replay → lap ${snap.lap}`,
    }
  },
})

const replayPlay = defineTool({
  name: 'replay_play',
  title: 'Play or pause replay',
  description:
    'Plays or pauses the race replay and sets its speed (1, 4, 16 or 64 times real time).',
  input: z.object({
    playing: z.boolean().default(true),
    speed: z
      .union(
        PLAYBACK_SPEEDS.map((s) => z.literal(s)) as [
          z.ZodLiteral<1>,
          z.ZodLiteral<4>,
          z.ZodLiteral<16>,
          z.ZodLiteral<64>,
        ],
      )
      .optional(),
  }),
  readOnly: false,
  async execute({ playing, speed }, ctx) {
    await ensureReplay(ctx)
    ctx.commands.setPlayback({ playing, ...(speed ? { speed } : {}) })
    const s = speed ?? ctx.getState().playback.speed
    return {
      text: playing ? `Playing at ${s}×.` : 'Paused.',
      effect: playing ? `Replay ▶ ${s}×` : 'Replay paused',
    }
  },
})

const getRaceOrder = defineTool({
  name: 'get_race_order',
  title: 'Race order',
  description:
    'Running order with gaps at the end of a lap (or at the current replay time when no lap is given). Race sessions only.',
  input: z.object({
    lap: z.number().int().positive().optional(),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  readOnly: true,
  async execute({ lap, limit }, ctx) {
    const { sessionId } = await ensureReplay(ctx)
    const replay = await ctx.getReplay(sessionId)
    const t =
      lap == null
        ? ctx.getState().playback.time
        : lap >= replay.totalLaps
          ? (replay.classification[0]?.time ?? replay.duration)
          : timeOfLap(replay, lap + 1) - 0.5
    if (lap != null) {
      ctx.commands.setPlayback({ playing: false })
      ctx.commands.seekReplay(t)
    }
    const table = standingsAt(replay, t).slice(0, limit)
    const rows = table.map(
      (s) =>
        `${s.position}. ${s.driver}${s.position === 1 ? '' : ` ${formatInterval(s.gap)}`}${s.state === 'pit' ? ' (pit)' : ''}`,
    )
    const label =
      lap == null ? `At ${formatRaceTime(t)}` : `End of lap ${Math.min(lap, replay.totalLaps)}`
    return {
      text: `${label}:\n${rows.join('\n')}`,
      data: table,
      effect: lap != null ? `Replay → end of lap ${lap}` : undefined,
    }
  },
})

const getPitStops = defineTool({
  name: 'get_pit_stops',
  title: 'Pit stops',
  description:
    'Pit stops in the race with lap, time in the pit lane and tyre change; optionally for one driver, in which case the replay jumps to their first stop.',
  input: z.object({ driver: z.string().optional() }),
  readOnly: false,
  async execute({ driver }, ctx) {
    const { sessionId } = await ensureReplay(ctx)
    const [replay, meta] = await Promise.all([ctx.getReplay(sessionId), ctx.getSession(sessionId)])
    const code = driver ? resolveDriver(meta, driver).code : undefined
    const stops = replay.pits.filter((p) => !code || p.driver === code)
    if (!stops.length) return { text: code ? `${code} didn't pit.` : 'No pit stops in this race.' }
    const describe = (p: (typeof stops)[number]) => {
      const stints = replay.stints[p.driver] ?? []
      const before = stints.find((s) => p.lap >= s.from && p.lap <= s.to)?.compound
      const after = stints.find((s) => p.lap + 1 >= s.from && p.lap + 1 <= s.to)?.compound
      const change = before && after ? ` ${before.toLowerCase()} → ${after.toLowerCase()}` : ''
      return `${p.driver} lap ${p.lap}${p.duration != null ? `, ${p.duration.toFixed(1)}s in the pit lane` : ''}${change}`
    }
    if (code && stops[0]?.in != null) {
      ctx.commands.setPlayback({ playing: false })
      ctx.commands.seekReplay(Math.max(0, stops[0].in - 8))
    }
    return {
      text: code
        ? stops.map(describe).join('\n')
        : `${stops.length} stops:\n${stops.map(describe).join('\n')}`,
      data: stops,
      effect: code ? `Replay → ${code}'s stop on lap ${stops[0]?.lap}` : undefined,
    }
  },
})

const getRaceControl = defineTool({
  name: 'get_race_control',
  title: 'Race control messages',
  description:
    'Race control messages: flags, incidents, investigations and penalties, optionally filtered to one lap.',
  input: z.object({
    filter: z.enum(['all', 'penalties', 'incidents', 'flags']).default('all'),
    lap: z.number().int().positive().optional(),
  }),
  readOnly: true,
  async execute({ filter, lap }, ctx) {
    const { sessionId } = await ensureReplay(ctx)
    const replay = await ctx.getReplay(sessionId)
    const match = (m: (typeof replay.messages)[number]) => {
      const text = m.message.toUpperCase()
      if (filter === 'penalties') return /PENALTY|REPRIMAND|INVESTIGATION|NOTED/.test(text)
      if (filter === 'incidents') return /INCIDENT|INVESTIGATION|NOTED/.test(text)
      if (filter === 'flags') return m.category === 'Flag'
      return true
    }
    const list = replay.messages.filter((m) => match(m) && (lap == null || m.lap === lap))
    if (!list.length) return { text: 'No matching race control messages.' }
    return {
      text: list
        .slice(0, 12)
        .map((m) => `Lap ${m.lap ?? '–'}: ${m.message}`)
        .join('\n')
        .concat(list.length > 12 ? `\n…and ${list.length - 12} more.` : ''),
      data: list,
    }
  },
})

export const replayTools = [
  replaySeek,
  replayPlay,
  getRaceOrder,
  getPitStops,
  getRaceControl,
] as const
