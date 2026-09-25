import type {
  ArchiveInputs,
  ArchivePatch,
  DuelSelection,
  HistoryInputs,
  PlaybackSpeed,
  StrategyInputs,
  Trace,
  View,
} from '@unbox-box/tools'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

/** App state that several components share. Shareable parts (session, duel, corner, traces)
 *  are mirrored to the URL by url-sync.ts, so every state is a deep link. */

export type CallStatus = 'pending' | 'running' | 'done' | 'error'

export interface CallEntry {
  tool: string
  input: Record<string, unknown>
  status: CallStatus
  effect?: string
  error?: string
}

export type Message =
  | { id: string; role: 'user'; text: string }
  | {
      id: string
      role: 'assistant'
      source: 'engine' | 'webmcp'
      status: 'running' | 'done' | 'error'
      text?: string
      calls: CallEntry[]
      suggestions?: string[]
    }

/** localStorage key for the docked Race Engineer preference. */
export const DOCK_KEY = 'unboxbox:engineer-docked'

export const DEFAULT_TRACES: Trace[] = ['delta', 'speed', 'throttle', 'brake', 'gear']

interface AppState {
  sessionId: string | null
  view: View
  /** The last view before Help opened, so a report can say where it came from. */
  lastView: View
  duel: DuelSelection | null
  corner: number | null
  traces: Trace[]
  agentOpen: boolean
  /** Wide screens: whether the Race Engineer is docked open beside the main area. */
  agentDocked: boolean
  /** Circuits view: the F1DB circuit id on show (null: the current session's circuit). */
  circuit: string | null
  paletteOpen: boolean
  messages: Message[]
  busy: boolean
  strategy: Partial<StrategyInputs>
  history: Partial<HistoryInputs>
  /** Race archive, Records, Engines and Nations: what each shows. */
  archive: Partial<ArchiveInputs>

  setSession(id: string): void
  setView(view: View): void
  setDuel(duel: DuelSelection): void
  swapDuel(): void
  setCorner(corner: number | null): void
  setTraces(traces: Trace[]): void
  setAgentOpen(open: boolean): void
  setAgentDocked(docked: boolean): void
  setCircuit(circuit: string | null): void
  setPaletteOpen(open: boolean): void
  pushMessage(message: Message): void
  updateMessage(id: string, update: (message: Message) => Message): void
  setBusy(busy: boolean): void
  setStrategy(update: Partial<StrategyInputs>): void
  setHistory(update: Partial<HistoryInputs>): void
  setArchive(update: ArchivePatch): void
}

export const useApp = create<AppState>()(
  subscribeWithSelector((set) => ({
    sessionId: null,
    view: 'lap-duel',
    lastView: 'lap-duel',
    duel: null,
    corner: null,
    traces: DEFAULT_TRACES,
    agentOpen: false,
    agentDocked: true,
    circuit: null,
    paletteOpen: false,
    messages: [],
    busy: false,
    strategy: {},
    history: {},
    archive: {},

    setSession: (sessionId) => set({ sessionId, duel: null, corner: null, strategy: {} }),
    setView: (view) => set((s) => ({ view, lastView: s.view === 'help' ? s.lastView : s.view })),
    setDuel: (duel) => set({ duel }),
    swapDuel: () =>
      set((s) =>
        s.duel ? { duel: { a: s.duel.b, b: s.duel.a, lapA: s.duel.lapB, lapB: s.duel.lapA } } : s,
      ),
    setCorner: (corner) => set({ corner }),
    setTraces: (traces) => set({ traces }),
    setAgentOpen: (agentOpen) => set({ agentOpen }),
    setCircuit: (circuit) => set({ circuit }),
    setAgentDocked: (agentDocked) => {
      set({ agentDocked })
      try {
        localStorage.setItem(DOCK_KEY, agentDocked ? '1' : '0')
      } catch {
        // Storage blocked (private window): the choice lasts for this visit.
      }
    },
    setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
    pushMessage: (message) => set((s) => ({ messages: [...s.messages, message] })),
    updateMessage: (id, update) =>
      set((s) => ({ messages: s.messages.map((m) => (m.id === id ? update(m) : m)) })),
    setBusy: (busy) => set({ busy }),
    setStrategy: (update) => set((s) => ({ strategy: { ...s.strategy, ...update } })),
    setHistory: (update) => set((s) => ({ history: { ...s.history, ...update } })),
    setArchive: (update) => set((s) => ({ archive: { ...s.archive, ...update } })),
  })),
)

/** Race replay clock. Kept in its own store: time changes every frame while playing, and
 *  only the canvas and a few throttled readouts subscribe to it. */
interface PlaybackStore {
  time: number
  playing: boolean
  speed: PlaybackSpeed
  focus: string | null
  seek(time: number): void
  set(update: { playing?: boolean; speed?: PlaybackSpeed }): void
  setFocus(driver: string | null): void
}

export const usePlayback = create<PlaybackStore>()(
  subscribeWithSelector((set) => ({
    time: 0,
    playing: false,
    speed: 16,
    focus: null,
    seek: (time) => set({ time: Math.max(0, time) }),
    set: (update) => set(update),
    setFocus: (focus) => set({ focus }),
  })),
)

/** Distance index under the pointer, shared by charts and the track map. Kept out of React
 *  state (60 fps); subscribers update the DOM directly. */
export const useHover = create<{ index: number | null; set(index: number | null): void }>()(
  (set) => ({ index: null, set: (index) => set({ index }) }),
)

let counter = 0
export const newId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`
