import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  HistoryIndexSchema,
  HistoryResultsSchema,
  HistoryStandingsSchema,
  ReplaySchema,
  SessionIndexSchema,
  SessionMetaSchema,
  TelemetrySchema,
  type SessionMeta,
} from '../src/data/schema'
import type { AppStateSnapshot, UnboxBoxContext } from '../src/tools/types'

export const DATA_DIR = join(__dirname, '../../../apps/web/public/data')
export const SESSION_ID = '2025-italian-grand-prix-q'
export const RACE_ID = '2025-italian-grand-prix-r'

const read = (path: string) => JSON.parse(readFileSync(join(DATA_DIR, path), 'utf8'))
const metaCache = new Map<string, SessionMeta>()

export function loadMeta(id = SESSION_ID): SessionMeta {
  if (!metaCache.has(id))
    metaCache.set(id, SessionMetaSchema.parse(read(`sessions/${id}/meta.json`)))
  return metaCache.get(id)!
}

export const loadReplay = (id = RACE_ID) => ReplaySchema.parse(read(`sessions/${id}/replay.json`))

let history:
  | {
      index: ReturnType<typeof HistoryIndexSchema.parse>
      results: ReturnType<typeof HistoryResultsSchema.parse>
    }
  | undefined
export function loadHistory() {
  history ??= {
    index: HistoryIndexSchema.parse(read('history/index.json')),
    results: HistoryResultsSchema.parse(read('history/results.json')),
  }
  return history
}

/** A UnboxBoxContext backed by the real data files and an in-memory state. */
export function createTestContext(sessionId = SESSION_ID): UnboxBoxContext & {
  state: AppStateSnapshot
  strategy: Record<string, unknown>
  archive: Record<string, unknown>
} {
  const first = loadMeta(sessionId)
  const [p1, p2] = first.results
  const state: AppStateSnapshot = {
    sessionId,
    view: 'lap-duel',
    duel:
      sessionId === SESSION_ID
        ? { a: 'VER', b: 'NOR', lapA: 17, lapB: 20 }
        : { a: p1!.driver, b: p2!.driver, lapA: p1!.lap!, lapB: p2!.lap! },
    corner: null,
    traces: ['delta', 'speed', 'throttle', 'brake'],
    playback: { time: 0, playing: false, speed: 4 },
  }
  const strategy: Record<string, unknown> = {}
  const archive: Record<string, unknown> = {}
  return {
    state,
    archive,
    strategy,
    async listSessions() {
      return SessionIndexSchema.parse(read('index.json')).sessions
    },
    async getSession(id) {
      return loadMeta(id ?? state.sessionId)
    },
    async getTelemetry(id, driver, lap) {
      return TelemetrySchema.parse(read(`sessions/${id}/tel/${driver}-${lap}.json`))
    },
    async getReplay(id) {
      return loadReplay(id)
    },
    async getHistory() {
      return loadHistory()
    },
    async getStandings() {
      return loadStandings()
    },
    getState: () => state,
    commands: {
      async loadSession(id) {
        state.sessionId = id
        const m = loadMeta(id)
        state.duel = {
          a: m.results[0]!.driver,
          b: m.results[1]!.driver,
          lapA: m.results[0]!.lap!,
          lapB: m.results[1]!.lap!,
        }
      },
      openView(view) {
        state.view = view
      },
      setDuel(selection) {
        state.duel = selection
      },
      highlightCorner(corner) {
        state.corner = corner
      },
      setTraces(traces) {
        state.traces = traces
      },
      seekReplay(time) {
        state.playback.time = time
      },
      setPlayback(update) {
        Object.assign(state.playback, update)
      },
      setStrategy(update) {
        Object.assign(strategy, update)
      },
      setHistory(update) {
        Object.assign(strategy, { history: update })
      },
      setArchive(update) {
        Object.assign(archive, update)
      },
      setCircuit(circuit) {
        archive.circuit = circuit
      },
    },
  }
}

export const loadStandings = () => HistoryStandingsSchema.parse(read('history/standings.json'))
