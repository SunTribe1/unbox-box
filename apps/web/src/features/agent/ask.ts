import {
  executeTool,
  findSession,
  parse,
  runCalls,
  type CallOutcome,
  type EnginePlan,
  type ToolCall,
} from '@unbox-box/tools'
import { browserContext } from '@/lib/context'
import { newId, useApp, type CallEntry, type Message } from '@/lib/store'

/** Tools whose text only confirms a UI change; their text is hidden when a tool in the same
 *  run produced a real answer. */
const QUIET = new Set(['highlight_corner', 'open_view', 'set_traces', 'load_session'])

const PACE_MS = 320

function answerText(outcomes: CallOutcome[]): string {
  const failed = outcomes.find((o) => o.error)
  if (failed) return failed.error!
  const informative = outcomes.filter((o) => o.result && !QUIET.has(o.call.tool))
  return (informative.length ? informative : outcomes)
    .map((o) => o.result?.text)
    .filter(Boolean)
    .join('\n\n')
}

function patchCall(messageId: string, index: number, patch: Partial<CallEntry>) {
  useApp
    .getState()
    .updateMessage(messageId, (m) =>
      m.role === 'assistant'
        ? { ...m, calls: m.calls.map((c, i) => (i === index ? { ...c, ...patch } : c)) }
        : m,
    )
}

const HISTORY_TOOLS = new Set([
  'head_to_head',
  'query_history',
  'circuit_history',
  'get_driver_career',
])

/** Parses a question. When it names another season or event ("Leclerc vs Sainz, Monaco
 *  2024"), the plan loads that session first and the rest is parsed against its drivers.
 *  History questions ("Who won at Monza?") never switch sessions. */
async function planQuestion(question: string): Promise<EnginePlan> {
  const state = browserContext.getState()
  const meta = await browserContext.getSession()
  const plan = parse(question, meta, state)
  if (plan.kind === 'calls' && plan.calls.some((c) => HISTORY_TOOLS.has(c.tool))) return plan

  const hit = findSession(question, await browserContext.listSessions(), state.sessionId)
  if (!hit) return plan
  const load: ToolCall = { tool: 'load_session', input: { sessionId: hit.id } }
  if (!hit.rest) return { kind: 'calls', calls: [load] }
  const next = await browserContext.getSession(hit.id)
  const rest = parse(hit.rest, next, { ...state, sessionId: hit.id })
  return { kind: 'calls', calls: rest.kind === 'calls' ? [load, ...rest.calls] : [load] }
}

/** The built-in Race Engineer: command engine → tool calls → animated run → answer. */
export async function ask(text: string) {
  const app = useApp.getState()
  const question = text.trim()
  if (!question || app.busy) return
  app.pushMessage({ id: newId(), role: 'user', text: question })
  app.setBusy(true)
  try {
    const plan = await planQuestion(question)
    if (plan.kind !== 'calls') {
      app.pushMessage({
        id: newId(),
        role: 'assistant',
        source: 'engine',
        status: 'done',
        text: plan.text,
        suggestions: plan.suggestions,
        calls: [],
      })
      return
    }
    const id = newId()
    app.pushMessage({
      id,
      role: 'assistant',
      source: 'engine',
      status: 'running',
      calls: plan.calls.map((c) => ({ ...c, status: 'pending' })),
    })
    const outcomes = await runCalls(
      plan.calls,
      browserContext,
      (event) => {
        if (event.type === 'start') patchCall(id, event.index, { status: 'running' })
        if (event.type === 'done') {
          patchCall(id, event.index, { status: 'done', effect: event.result.effect })
        }
        if (event.type === 'error')
          patchCall(id, event.index, { status: 'error', error: event.error })
      },
      PACE_MS,
    )
    const failed = outcomes.some((o) => o.error)
    useApp
      .getState()
      .updateMessage(id, (m) =>
        m.role === 'assistant'
          ? { ...m, status: failed ? 'error' : 'done', text: answerText(outcomes) }
          : m,
      )
  } catch (error) {
    app.pushMessage({
      id: newId(),
      role: 'assistant',
      source: 'engine',
      status: 'error',
      text: error instanceof Error ? error.message : 'Something went wrong.',
      calls: [],
    })
  } finally {
    useApp.getState().setBusy(false)
  }
}

/** Runs one tool call on behalf of an external agent (WebMCP) and logs it in the panel. */
export async function runExternalCall(call: ToolCall): Promise<string> {
  const id = newId()
  const message: Message = {
    id,
    role: 'assistant',
    source: 'webmcp',
    status: 'running',
    calls: [{ ...call, status: 'running' }],
  }
  useApp.getState().pushMessage(message)
  try {
    const result = await executeTool(call, browserContext)
    patchCall(id, 0, { status: 'done', effect: result.effect })
    useApp.getState().updateMessage(id, (m) => ({ ...m, status: 'done' }) as Message)
    return result.text
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error)
    patchCall(id, 0, { status: 'error', error: text })
    useApp.getState().updateMessage(id, (m) => ({ ...m, status: 'error' }) as Message)
    throw error
  }
}
