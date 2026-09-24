'use client'

import { isWebMcpAvailable } from '@unbox-box/webmcp'
import { useEffect, useSyncExternalStore } from 'react'

const noopSubscribe = () => () => {}

/** Registers every tool with the browser's AI agent (WebMCP) when one exists. Browser
 *  agents then drive the same commands the UI uses; each call shows up in the agent panel.
 *  The registry loads only when WebMCP is present, so other visitors never download it. */
export function useWebMcp(): boolean {
  const available = useSyncExternalStore(noopSubscribe, isWebMcpAvailable, () => false)
  useEffect(() => {
    if (!available) return
    let cleanup: (() => void) | undefined
    let cancelled = false
    void Promise.all([
      import('@unbox-box/tools'),
      import('@unbox-box/webmcp'),
      import('./ask'),
    ]).then(([{ inputJsonSchema, tools }, { registerWebMcpTools }, { runExternalCall }]) => {
      if (cancelled) return
      cleanup = registerWebMcpTools(
        tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: inputJsonSchema(tool),
          readOnly: tool.readOnly,
          run: (input) => runExternalCall({ tool: tool.name, input }),
        })),
      )
    })
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [available])
  return available
}
