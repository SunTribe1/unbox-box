import { describe, expect, it } from 'vitest'
import {
  formatInterval,
  cleanReplay,
  gapHistory,
  parse,
  progressAt,
  runCalls,
  standingsAt,
  timeAtProgress,
  timeOfLap,
} from '../src'
import { createTestContext, loadMeta, loadReplay, RACE_ID } from './context'

const replay = loadReplay()

describe('replay maths', () => {
  it('matches the real 2025 Italian GP podium at the finish', () => {
    const finish = replay.classification[0]!.time!
    const table = standingsAt(replay, finish + 30)
    expect(table.slice(0, 3).map((s) => s.driver)).toEqual(['VER', 'NOR', 'PIA'])
    expect(table.at(-1)!.driver).toBe('HUL') // did not start
  })

  it('progress and time lookups are inverse', () => {
    const t = 1234
    const p = progressAt(replay, 'LEC', t)
    expect(timeAtProgress(replay, 'LEC', p)).toBeCloseTo(t, 0)
  })

  it('gaps grow down the order, like a timing screen', () => {
    const table = standingsAt(replay, timeOfLap(replay, 31) - 0.5).filter(
      (s) => s.gap && 'seconds' in s.gap,
    )
    const gaps = table.map((s) => (s.gap as { seconds: number }).seconds)
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b))
  })

  it('computes live gaps like a timing screen', () => {
    // Just before the leader finishes, Norris is about 19 seconds behind.
    const finish = replay.classification[0]!.time!
    const nor = standingsAt(replay, finish - 1).find((s) => s.driver === 'NOR')!
    expect(nor.gap && 'seconds' in nor.gap ? nor.gap.seconds : 0).toBeGreaterThan(15)
    expect(formatInterval({ laps: 1 })).toBe('+1 L')
  })

  it('knows when each lap started', () => {
    expect(timeOfLap(replay, 1)).toBe(0)
    expect(timeOfLap(replay, 30)).toBeGreaterThan(timeOfLap(replay, 29))
  })

  it('starts a lap when the first car starts it, even if that car did not win', () => {
    const winner = replay.classification[0]!.driver
    const lapStarts = {
      ...replay.lapStarts,
      [winner]: replay.lapStarts[winner]!.map((t) => (t == null ? t : t + 60)),
    }
    const shifted = { ...replay, lapStarts }
    const first = Math.min(
      ...Object.values(lapStarts)
        .map((starts) => starts[29])
        .filter((t): t is number => t != null),
    )
    expect(timeOfLap(shifted, 30)).toBe(first)
  })

  it('shows cars in the pit lane', () => {
    const stop = replay.pits.find((p) => p.driver === 'VER')!
    const at = (stop.in! + stop.out!) / 2
    expect(standingsAt(replay, at).find((s) => s.driver === 'VER')!.state).toBe('pit')
  })
})

describe('replay engine and tools', () => {
  const race = createTestContext(RACE_ID)
  const calls = (text: string, view: 'lap-duel' | 'replay' = 'replay') => {
    race.state.view = view
    const plan = parse(text, loadMeta(RACE_ID), race.state)
    return plan.kind === 'calls' ? plan.calls : plan.kind
  }

  it('understands playback, seeking, order, pits and race control', () => {
    expect(calls('Play at 16x')).toEqual([
      { tool: 'replay_play', input: { playing: true, speed: 16 } },
    ])
    expect(calls('pause')).toEqual([{ tool: 'replay_play', input: { playing: false } }])
    expect(calls('Who was leading on lap 30?')).toEqual([
      { tool: 'get_race_order', input: { lap: 30 } },
    ])
    expect(calls('When did Norris pit?')).toEqual([
      { tool: 'get_pit_stops', input: { driver: 'NOR' } },
    ])
    expect(calls('jump to lap 12')).toEqual([{ tool: 'replay_seek', input: { lap: 12 } }])
    expect(calls('Show the penalties')).toEqual([
      { tool: 'get_race_control', input: { filter: 'penalties' } },
    ])
    expect(calls('watch the race', 'lap-duel')).toEqual([
      { tool: 'replay_play', input: { playing: true } },
    ])
  })

  it('still compares laps from the replay view', () => {
    expect(calls('Compare Verstappen and Norris')).toMatchObject([
      { tool: 'compare_laps', input: { driverA: 'VER', driverB: 'NOR' } },
      { tool: 'explain_gap', input: {} },
    ])
  })

  it('opens the race from qualifying when asked for the replay', async () => {
    const ctx = createTestContext()
    const plan = parse('Watch the race at 16x', loadMeta(), ctx.state)
    if (plan.kind !== 'calls') throw new Error('expected calls')
    const [outcome] = await runCalls(plan.calls, ctx)
    expect(outcome!.error).toBeUndefined()
    expect(ctx.state).toMatchObject({
      sessionId: RACE_ID,
      view: 'replay',
      playback: { playing: true, speed: 16 },
    })
  })

  it('reports the order at the end of a lap and moves the replay there', async () => {
    const [outcome] = await runCalls(
      [{ tool: 'get_race_order', input: { lap: 30, limit: 3 } }],
      race,
    )
    expect(outcome!.result!.text).toMatch(/^End of lap 30:\n1\. /)
    expect(race.state.playback.time).toBeGreaterThan(0)
  })

  it('lists pit stops with tyre changes', async () => {
    const [outcome] = await runCalls(
      [{ tool: 'get_pit_stops', input: { driver: 'Verstappen' } }],
      race,
    )
    expect(outcome!.result!.text).toMatch(/VER lap 37, .*medium → hard/)
  })
})

describe('strategy engine and tools', () => {
  const race = createTestContext(RACE_ID)
  const calls = (text: string) => {
    race.state.view = 'strategy'
    const plan = parse(text, loadMeta(RACE_ID), race.state)
    return plan.kind === 'calls' ? plan.calls : plan.kind
  }

  it('understands what-ifs, undercuts, degradation and stints', () => {
    expect(calls('What if Norris pitted on lap 30 for hards?')).toEqual([
      { tool: 'simulate_pit_stop', input: { driver: 'NOR', lap: 30, compound: 'HARD' } },
    ])
    expect(calls('Could Piastri undercut Norris on lap 20?')).toEqual([
      { tool: 'undercut_check', input: { attacker: 'PIA', defender: 'NOR', lap: 20 } },
    ])
    expect(calls('How fast did the tyres degrade?')).toEqual([
      { tool: 'get_degradation', input: {} },
    ])
    expect(calls("Show Leclerc's tyre strategy")).toEqual([
      { tool: 'get_stints', input: { driver: 'LEC' } },
    ])
    expect(calls('open strategy')).toEqual([{ tool: 'open_view', input: { view: 'strategy' } }])
  })

  it('opens the Strategy Lab from qualifying and runs a simulation', async () => {
    const ctx = createTestContext()
    const [outcome] = await runCalls(
      [{ tool: 'simulate_pit_stop', input: { driver: 'Norris', lap: 30, compound: 'HARD' } }],
      ctx,
    )
    expect(outcome!.error).toBeUndefined()
    expect(outcome!.result!.text).toMatch(
      /One stop on lap 30 for hards: .* (faster|slower) than NOR/,
    )
    expect(ctx.state).toMatchObject({ sessionId: RACE_ID, view: 'strategy' })
    expect(ctx.strategy).toMatchObject({ simDriver: 'NOR', simLap: 30, simCompound: 'HARD' })
  })

  it('explains an undercut', async () => {
    const [outcome] = await runCalls(
      [{ tool: 'undercut_check', input: { attacker: 'PIA', defender: 'NOR', lap: 20 } }],
      race,
    )
    expect(outcome!.result!.text).toMatch(/^Undercut on lap 20 .* (works|falls short)/)
  })
})

describe('gapHistory', () => {
  it('gives each lap the gap to the leader at the line, zero for the leader', () => {
    const rows = gapHistory(replay, ['VER', 'NOR', 'HUL'])
    expect(rows).toHaveLength(replay.totalLaps)
    const last = rows.at(-1)!
    expect(last.lap).toBe(replay.totalLaps)
    expect(last.VER).toBe(0) // winner leads at the flag
    expect(last.NOR).toBeGreaterThan(0)
    expect(last.NOR).toBeLessThan(60)
    expect(rows[0]!.HUL).toBeNull() // never started
  })

  it('drops drivers who are lapped (gap would be a whole lap)', () => {
    const rows = gapHistory(replay, Object.keys(replay.progress))
    for (const row of rows) {
      for (const [k, v] of Object.entries(row))
        if (k !== 'lap' && v != null) expect(v).toBeLessThan(120)
    }
  })
})

describe('cleanReplay', () => {
  const base = {
    stints: {
      VER: [
        { stint: 1, compound: 'MEDIUM', from: 1, to: 2, age: 0 },
        { stint: 2, compound: 'MEDIUM', from: 3, to: 24, age: 2 }, // same set carried on
        { stint: 3, compound: 'HARD', from: 25, to: 49, age: 0 },
        { stint: 4, compound: 'HARD', from: 50, to: 60, age: 3 }, // used set: a real stop
      ],
    },
    pits: [
      { driver: 'VER', lap: 2, in: 190, out: 206, duration: 16.4 },
      { driver: 'VER', lap: 24, in: 1826, out: 1847, duration: 21.3 },
      { driver: 'VER', lap: 49, in: 3584, out: 3605, duration: 21.6 },
    ],
  }

  it('merges a stint that continues on the same tyres and drops its phantom stop', () => {
    const clean = cleanReplay(base)
    expect(clean.stints.VER!.map((s) => [s.compound, s.from, s.to])).toEqual([
      ['MEDIUM', 1, 24],
      ['HARD', 25, 49],
      ['HARD', 50, 60],
    ])
    expect(clean.pits.map((p) => p.lap)).toEqual([24, 49])
  })

  it('leaves real data untouched', () => {
    const clean = cleanReplay(replay)
    expect(clean.pits.length).toBeGreaterThan(0)
    expect(clean.pits.length).toBeLessThanOrEqual(replay.pits.length)
  })
})
