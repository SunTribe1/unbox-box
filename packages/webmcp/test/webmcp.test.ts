import { afterEach, describe, expect, it, vi } from 'vitest'
import { isWebMcpAvailable, registerWebMcpTools, type WebMcpTool } from '../src'

const tool: WebMcpTool = {
  name: 'echo',
  description: 'Echoes input',
  inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
  readOnly: true,
  run: async (input) => `echo: ${String(input.text)}`,
}

describe('registerWebMcpTools', () => {
  it('does nothing without a model context', () => {
    expect(() => registerWebMcpTools([tool], { context: null })()).not.toThrow()
  })

  it('registers via registerTool and unregisters on cleanup', async () => {
    const registered: { execute(i: Record<string, unknown>): Promise<unknown> }[] = []
    const unregister = vi.fn()
    const context = {
      registerTool: vi.fn((t) => {
        registered.push(t)
        return { unregister }
      }),
    }
    const onCall = vi.fn()
    const cleanup = registerWebMcpTools([tool], { context, onCall })
    expect(context.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'echo', annotations: { readOnlyHint: true } }),
    )
    await expect(registered[0]!.execute({ text: 'hi' })).resolves.toEqual({
      content: [{ type: 'text', text: 'echo: hi' }],
    })
    expect(onCall).toHaveBeenCalledWith('echo')
    cleanup()
    expect(unregister).toHaveBeenCalled()
  })

  it('falls back to provideContext and reports errors as isError', async () => {
    let provided: { execute(i: Record<string, unknown>): Promise<unknown> }[] = []
    const context = {
      provideContext: vi.fn(({ tools }) => (provided = tools)),
      clearContext: vi.fn(),
    }
    const failing = { ...tool, run: async () => Promise.reject(new Error('nope')) }
    const cleanup = registerWebMcpTools([failing], { context })
    await expect(provided[0]!.execute({})).resolves.toEqual({
      content: [{ type: 'text', text: 'nope' }],
      isError: true,
    })
    cleanup()
    expect(context.clearContext).toHaveBeenCalled()
  })

  it('unregisters by name when registerTool returns no handle', () => {
    const context = { registerTool: vi.fn(() => undefined), unregisterTool: vi.fn() }
    registerWebMcpTools([tool], { context })()
    expect(context.unregisterTool).toHaveBeenCalledWith('echo')
  })

  it('does nothing when the context supports neither API', () => {
    expect(() => registerWebMcpTools([tool], { context: {} })()).not.toThrow()
  })

  it('reports non-Error failures as text', async () => {
    let provided: { execute(i: Record<string, unknown>): Promise<unknown> }[] = []
    const context = { provideContext: vi.fn(({ tools }) => (provided = tools)) }
    registerWebMcpTools([{ ...tool, run: async () => Promise.reject('plain') }], { context })
    await expect(provided[0]!.execute({})).resolves.toMatchObject({ isError: true })
  })
})

describe('isWebMcpAvailable', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('finds the API on document or navigator', () => {
    expect(isWebMcpAvailable()).toBe(false) // no document: not a browser
    vi.stubGlobal('document', {})
    vi.stubGlobal('navigator', { modelContext: {} })
    expect(isWebMcpAvailable()).toBe(true)
    vi.stubGlobal('navigator', undefined)
    vi.stubGlobal('document', { modelContext: {} })
    expect(isWebMcpAvailable()).toBe(true)
  })
})
