import { describe, expect, it } from 'vitest'
import { inputJsonSchema, parse, runCalls, tools } from '../src'
import { createTestContext, loadMeta } from './context'

describe('tools end to end', () => {
  it('runs the flagship question and changes app state', async () => {
    const ctx = createTestContext()
    const plan = parse('Where did Piastri lose time to Norris?', loadMeta(), ctx.state)
    if (plan.kind !== 'calls') throw new Error('expected calls')
    const events: string[] = []
    const outcomes = await runCalls(plan.calls, ctx, (e) => events.push(`${e.type}:${e.call.tool}`))
    expect(outcomes.every((o) => o.result)).toBe(true)
    expect(ctx.state.duel).toMatchObject({ a: 'NOR', b: 'PIA' })
    expect(ctx.state.corner).not.toBeNull()
    expect(outcomes[1]!.result!.text).toMatch(/Oscar Piastri was 0\.113s slower than Lando Norris/)
    expect(events).toEqual([
      'start:compare_laps',
      'done:compare_laps',
      'start:explain_gap',
      'done:explain_gap',
    ])
  })

  it('reports friendly errors and stops', async () => {
    const ctx = createTestContext()
    const outcomes = await runCalls(
      [
        { tool: 'compare_laps', input: { driverA: 'Senna', driverB: 'VER' } },
        { tool: 'explain_gap', input: {} },
      ],
      ctx,
    )
    expect(outcomes).toHaveLength(1)
    expect(outcomes[0]!.error).toMatch(/Unknown driver "Senna"/)
  })

  it('validates input with the schema', async () => {
    const ctx = createTestContext()
    const [outcome] = await runCalls([{ tool: 'set_traces', input: { traces: ['nitro'] } }], ctx)
    expect(outcome!.error).toMatch(/Invalid input for set_traces/)
  })

  it('exposes a JSON Schema object for every tool', () => {
    for (const tool of tools) {
      const schema = inputJsonSchema(tool)
      expect(schema.type).toBe('object')
      expect(tool.description.length).toBeGreaterThan(20)
    }
  })
})
