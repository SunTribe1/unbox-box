import { create } from 'zustand'

/** The start-lights loading screen shown when you enter the app from the landing page.
 *  idle → lighting (the five lights come on) → out (lights out: the app is revealed) → idle. */
export type LightsPhase = 'idle' | 'lighting' | 'out'

interface StartLightsState {
  phase: LightsPhase
  /** Increments on every start, so each run begins with all lights off. */
  run: number
  /** What is loading, e.g. "Lap Duel": shown under the lights and read by screen readers. */
  label: string
  start: (label: string) => void
  lightsOut: () => void
  done: () => void
}

export const useStartLights = create<StartLightsState>((set) => ({
  phase: 'idle',
  run: 0,
  label: 'Lap Duel',
  start: (label) => set((s) => ({ phase: 'lighting', run: s.run + 1, label })),
  lightsOut: () => set((s) => (s.phase === 'lighting' ? { phase: 'out' } : s)),
  done: () => set({ phase: 'idle' }),
}))

/** Timings, in milliseconds. A real start lights one column per second; this is faster so it
 *  never feels slower than the data it covers. */
export const LIGHTS = {
  count: 5,
  interval: 380,
  /** The shortest time all five stay lit before they can go out. */
  hold: 320,
  /** Lights go out anyway after this long, so a slow network never traps the screen. */
  maxWait: 9000,
  fadeOut: 420,
} as const
