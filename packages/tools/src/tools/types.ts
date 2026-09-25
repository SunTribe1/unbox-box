import '../zod-setup'
import type { z } from 'zod'
import type {
  HistoryData,
  HistoryStandings,
  Replay,
  SessionMeta,
  SessionSummary,
  Telemetry,
} from '../data/schema'

export const VIEWS = [
  'lap-duel',
  'replay',
  'strategy',
  'history',
  'races',
  'circuits',
  'records',
  'engines',
  'nations',
  'help',
] as const
export type View = (typeof VIEWS)[number]

export const TRACES = ['delta', 'speed', 'throttle', 'brake', 'gear', 'rpm'] as const
export type Trace = (typeof TRACES)[number]

export interface DuelSelection {
  a: string
  b: string
  lapA: number
  lapB: number
}

export const PLAYBACK_SPEEDS = [1, 4, 16, 64] as const
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

export interface PlaybackState {
  /** Race time in seconds from the start. */
  time: number
  playing: boolean
  speed: PlaybackSpeed
}

export interface StrategyInputs {
  simDriver: string
  simLap: number
  simCompound: string
  attacker: string
  defender: string
  undercutLap: number
}

export interface HistoryInputs {
  /** F1DB driver ids. */
  a: string
  b: string
  stat: string
  from: number | null
  to: number | null
  circuit: string | null
  /** Which History section is open, and who or what it shows (F1DB ids, season year). */
  tab?: HistoryTab
  driver?: string
  team?: string
  season?: number
}

/** What the archive views show: a race weekend, a record board, a maker, a nation. */
export interface ArchiveInputs {
  season: number
  /** Race Archive season tab: "championship", "calendar", "entries", "drivers", "teams". */
  section: string
  round: number
  /** Weekend session tab: "race", "qualifying", "fp1"... */
  session: string
  scope: string
  board: string
  /** "all", or a decade: "1990s". */
  era: string
  kind: 'engine' | 'tyre'
  /** F1DB maker id. */
  maker: string
  /** ISO 3166 alpha-2 code. */
  nation: string
}

/** A change to the archive state; `undefined` clears a key (back to the index page). */
export type ArchivePatch = { [K in keyof ArchiveInputs]?: ArchiveInputs[K] | undefined }

export const HISTORY_TABS = ['head-to-head', 'drivers', 'teams'] as const
export type HistoryTab = (typeof HISTORY_TABS)[number]

export interface AppStateSnapshot {
  sessionId: string
  view: View
  duel: DuelSelection
  corner: number | null
  traces: Trace[]
  playback: PlaybackState
}

/** Everything a tool may touch. The web app, tests and the MCP server each provide their own
 *  implementation (dependency inversion), so tools never import React, stores or fetch. */
export interface UnboxBoxContext {
  listSessions(): Promise<SessionSummary[]>
  getSession(id?: string): Promise<SessionMeta>
  getTelemetry(sessionId: string, driver: string, lap: number): Promise<Telemetry>
  getReplay(sessionId: string): Promise<Replay>
  getHistory(): Promise<HistoryData>
  /** Official standings after every round (only fetched for championship questions). */
  getStandings(): Promise<HistoryStandings>
  getState(): AppStateSnapshot
  commands: {
    loadSession(id: string): Promise<void>
    openView(view: View): void
    setDuel(selection: DuelSelection): void
    highlightCorner(corner: number | null): void
    setTraces(traces: Trace[]): void
    seekReplay(time: number): void
    setPlayback(update: { playing?: boolean; speed?: PlaybackSpeed }): void
    setStrategy(update: Partial<StrategyInputs>): void
    setHistory(update: Partial<HistoryInputs>): void
    /** Race Archive, Record Book, Engines & Tyres and Nations selections. */
    setArchive(update: ArchivePatch): void
    /** Circuits view: a circuit's F1DB id, or null for the index. */
    setCircuit(circuit: string | null): void
  }
}

export interface ToolResult {
  /** Plain-language answer, used by the chat panel and returned to agents. */
  text: string
  /** Structured result for agents and tests. */
  data?: unknown
  /** What changed on screen, shown in the tool-call log. */
  effect?: string | undefined
}

export interface ToolDefinition<S extends z.ZodType = z.ZodType> {
  name: string
  title: string
  description: string
  input: S
  /** True when the tool only reads data and changes nothing on screen. */
  readOnly: boolean
  execute(input: z.output<S>, ctx: UnboxBoxContext): Promise<ToolResult>
}

export function defineTool<S extends z.ZodType>(tool: ToolDefinition<S>): ToolDefinition<S> {
  return tool
}
