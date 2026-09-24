import '../zod-setup'
import { z } from 'zod'
import { fitModel, simulateOneStop, stintsFor, undercut } from '../analysis/strategy'
import { resolveDriver } from '../data/lookup'
import { ensureRace } from './replay-tools'
import { defineTool, type UnboxBoxContext } from './types'

const compound = z.enum(['SOFT', 'MEDIUM', 'HARD']).describe('Dry tyre compound for the new set.')

async function raceContext(ctx: UnboxBoxContext) {
  const { sessionId, note } = await ensureRace(ctx, 'strategy')
  const [meta, replay] = await Promise.all([ctx.getSession(sessionId), ctx.getReplay(sessionId)])
  return { meta, replay, model: fitModel(meta, replay), note }
}

const lower = (s: string) => s.toLowerCase()

const getStints = defineTool({
  name: 'get_stints',
  title: 'Tyre strategies',
  description:
    'Opens the Strategy Lab and lists tyre stints (compound and laps) for one driver or the top ten finishers.',
  input: z.object({ driver: z.string().optional() }),
  readOnly: false,
  async execute({ driver }, ctx) {
    const { meta, replay, note } = await raceContext(ctx)
    const codes = driver
      ? [resolveDriver(meta, driver).code]
      : replay.classification.slice(0, 10).map((c) => c.driver)
    const lines = codes.map((code) => {
      const stints = stintsFor(replay, code)
      return `${code}: ${stints.map((s) => `${lower(s.compound)} laps ${s.from}–${s.to}`).join(', ')} (${stints.length - 1} stop${stints.length === 2 ? '' : 's'})`
    })
    return {
      text: [note, lines.join('\n')].filter(Boolean).join('\n'),
      data: Object.fromEntries(codes.map((c) => [c, stintsFor(replay, c)])),
      effect: 'View → Strategy Lab',
    }
  },
})

const getDegradation = defineTool({
  name: 'get_degradation',
  title: 'Tyre degradation',
  description:
    'Tyre model fitted on this race: lap time lost per lap of tyre age for each compound, the fuel effect and the average pit stop time loss.',
  input: z.object({}),
  readOnly: true,
  async execute(_input, ctx) {
    const { model } = await raceContext(ctx)
    const rows = Object.entries(model.compounds)
      .sort((a, b) => a[1]!.deg - b[1]!.deg)
      .map(([c, m]) => `${lower(c)} +${m!.deg.toFixed(3)} s per lap of age (${m!.laps} clean laps)`)
    return {
      text: `Tyre degradation: ${rows.join('; ')}. Burning fuel makes cars ${Math.abs(model.fuel).toFixed(3)} s faster each lap. A pit stop costs about ${model.pitLoss.toFixed(1)} s.`,
      data: model,
    }
  },
})

const simulatePitStop = defineTool({
  name: 'simulate_pit_stop',
  title: 'Simulate a pit stop',
  description:
    'What if a driver had made one stop on a given lap onto a given compound? Model estimate of the time gained or lost and a finishing-position spread from 500 simulated races. Other drivers keep their real results.',
  input: z.object({
    driver: z.string(),
    lap: z.number().int().min(2),
    compound,
  }),
  readOnly: false,
  async execute({ driver, lap, compound: c }, ctx) {
    const { meta, replay, model } = await raceContext(ctx)
    const code = resolveDriver(meta, driver).code
    const sim = simulateOneStop(meta, replay, model, code, lap, c)
    ctx.commands.setStrategy({ simDriver: code, simLap: sim.pitLap, simCompound: c })
    const faster = sim.delta < 0
    const range =
      sim.p10 === sim.p90
        ? `P${sim.p50} in almost every run`
        : `P${sim.p10}–P${sim.p90} in 80% of runs`
    const lines = [
      `One stop on lap ${sim.pitLap} for ${lower(c)}s: ${Math.abs(sim.delta).toFixed(1)} s ${faster ? 'faster' : 'slower'} than ${code}'s real race (model estimate).`,
      `Likely P${sim.p50} (${range}); actual result P${sim.actualPosition}.`,
    ]
    if (!sim.legal) {
      lines.push(
        'Note: in a dry race a driver must use two different compounds, so this strategy would be illegal.',
      )
    }
    return {
      text: lines.join(' '),
      data: sim,
      effect: `Simulator → ${code} L${sim.pitLap} ${lower(c)}`,
    }
  },
})

const undercutCheck = defineTool({
  name: 'undercut_check',
  title: 'Undercut check',
  description:
    'Would the attacker have passed the defender by pitting one lap earlier? Uses the real gap at the end of the lap and the fitted tyre model; both cars pay the same pit loss.',
  input: z.object({
    attacker: z.string(),
    defender: z.string(),
    lap: z.number().int().min(1),
    compound: compound.optional(),
  }),
  readOnly: false,
  async execute({ attacker, defender, lap, compound: c }, ctx) {
    const { meta, replay, model } = await raceContext(ctx)
    const a = resolveDriver(meta, attacker).code
    const d = resolveDriver(meta, defender).code
    const r = undercut(meta, replay, model, a, d, lap, c)
    ctx.commands.setStrategy({ attacker: a, defender: d, undercutLap: lap })
    const verdict = r.works
      ? `works: ${a} comes out ${r.margin.toFixed(1)} s ahead`
      : `falls short: ${a} stays ${Math.abs(r.margin).toFixed(1)} s behind`
    return {
      text: `Undercut on lap ${lap} (${a} pits first, ${d} a lap later, both onto ${lower(r.compound)}s) ${verdict}. Gap before the stops: ${r.gapBefore.toFixed(1)} s. Model estimate.`,
      data: r,
      effect: `Undercut → ${a} on ${d}, lap ${lap}`,
    }
  },
})

export const strategyTools = [getStints, getDegradation, simulatePitStop, undercutCheck] as const
