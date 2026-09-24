/**
 * WebMCP adapter. WebMCP lets a page expose tools to AI agents running in the browser.
 * The spec is young: in July 2026 the API moved from `navigator.modelContext` to
 * `document.modelContext`, so this file is the single place that knows either name.
 */

export interface WebMcpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  readOnly: boolean
  /** Returns plain text for the agent; throw to report an error. */
  run(input: Record<string, unknown>): Promise<string>
}

interface ModelContextToolResult {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

interface ModelContextTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: { readOnlyHint?: boolean }
  execute(input: Record<string, unknown>): Promise<ModelContextToolResult>
}

interface ModelContext {
  registerTool?(tool: ModelContextTool): { unregister?(): void } | undefined
  unregisterTool?(name: string): void
  provideContext?(context: { tools: ModelContextTool[] }): void
  clearContext?(): void
}

export function getModelContext(): ModelContext | null {
  if (typeof document === 'undefined') return null
  const fromDocument = (document as unknown as { modelContext?: ModelContext }).modelContext
  const fromNavigator =
    typeof navigator !== 'undefined'
      ? (navigator as unknown as { modelContext?: ModelContext }).modelContext
      : undefined
  return fromDocument ?? fromNavigator ?? null
}

export function isWebMcpAvailable(): boolean {
  return getModelContext() !== null
}

function toModelContextTool(tool: WebMcpTool, onCall?: (name: string) => void): ModelContextTool {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: { readOnlyHint: tool.readOnly },
    async execute(input) {
      onCall?.(tool.name)
      try {
        return { content: [{ type: 'text', text: await tool.run(input ?? {}) }] }
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error)
        return { content: [{ type: 'text', text }], isError: true }
      }
    },
  }
}

/** Unregister for when there was nothing to register. */
const noop = (): void => undefined

/**
 * Registers tools with the browser's agent, if there is one. Returns a cleanup function.
 * Safe to call in any browser: without WebMCP it does nothing.
 */
export function registerWebMcpTools(
  tools: WebMcpTool[],
  options: { onCall?: (name: string) => void; context?: ModelContext | null } = {},
): () => void {
  const mc = options.context === undefined ? getModelContext() : options.context
  if (!mc) return noop
  const mapped = tools.map((t) => toModelContextTool(t, options.onCall))

  if (typeof mc.registerTool === 'function') {
    const handles = mapped.map((tool) => mc.registerTool!(tool))
    return () => {
      handles.forEach((handle, i) => {
        if (handle && typeof handle.unregister === 'function') handle.unregister()
        else mc.unregisterTool?.(mapped[i]!.name)
      })
    }
  }
  if (typeof mc.provideContext === 'function') {
    mc.provideContext({ tools: mapped })
    return () => mc.clearContext?.()
  }
  return noop
}
