import '../zod-setup'
import { z } from 'zod'
import { getTool } from '../tools/registry'
import type { UnboxBoxContext, ToolResult } from '../tools/types'

export interface ToolCall {
  tool: string
  input: Record<string, unknown>
}

export type RunEvent =
  | { type: 'start'; index: number; call: ToolCall }
  | { type: 'done'; index: number; call: ToolCall; result: ToolResult }
  | { type: 'error'; index: number; call: ToolCall; error: string }

export interface CallOutcome {
  call: ToolCall
  result?: ToolResult
  error?: string
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Validates and executes one tool call. Used by every surface (command engine, WebMCP,
 *  LLM agents, MCP server), so validation and error text are identical everywhere. */
export async function executeTool(call: ToolCall, ctx: UnboxBoxContext): Promise<ToolResult> {
  const tool = getTool(call.tool)
  if (!tool) throw new Error(`Unknown tool "${call.tool}".`)
  const parsed = tool.input.safeParse(call.input ?? {})
  if (!parsed.success)
    throw new Error(`Invalid input for ${call.tool}: ${z.prettifyError(parsed.error)}`)
  return tool.execute(parsed.data, ctx)
}

/** Default event sink: runs without progress updates. */
const noop = (): void => undefined

/** Runs calls in order, emitting events so the UI can animate each step. Stops at the first
 *  error. `pace` adds a short pause between steps so people can follow along. */
export async function runCalls(
  calls: ToolCall[],
  ctx: UnboxBoxContext,
  onEvent: (event: RunEvent) => void = noop,
  pace = 0,
): Promise<CallOutcome[]> {
  const outcomes: CallOutcome[] = []
  for (const [index, call] of calls.entries()) {
    onEvent({ type: 'start', index, call })
    if (pace) await sleep(pace)
    try {
      const result = await executeTool(call, ctx)
      outcomes.push({ call, result })
      onEvent({ type: 'done', index, call, result })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      outcomes.push({ call, error })
      onEvent({ type: 'error', index, call, error })
      break
    }
  }
  return outcomes
}
