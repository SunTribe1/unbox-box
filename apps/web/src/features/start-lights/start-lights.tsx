'use client'

import { useIsFetching } from '@tanstack/react-query'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { LIGHTS, useStartLights } from './store'

/** Five red lights come on one by one while the chosen view loads, then all go out together, like
 *  the start of a Grand Prix. Lives in the providers, so it stays up across the page change
 *  from the landing page to the app. */
export function StartLights() {
  const phase = useStartLights((s) => s.phase)
  const run = useStartLights((s) => s.run)
  const label = useStartLights((s) => s.label)
  const done = useStartLights((s) => s.done)

  useEffect(() => {
    if (phase !== 'out') return
    const t = setTimeout(done, LIGHTS.fadeOut)
    return () => clearTimeout(t)
  }, [phase, done])

  const out = phase === 'out'
  return (
    <AnimatePresence>
      {phase !== 'idle' && (
        <m.div
          key="lights"
          role="status"
          aria-live="polite"
          aria-label={out ? 'Lights out' : `Loading ${label}`}
          className="fixed inset-0 z-[100] grid place-items-center bg-brand-ink"
          initial={{ opacity: 0 }}
          animate={{ opacity: out ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: out ? LIGHTS.fadeOut / 1000 : 0.2, delay: out ? 0.12 : 0 }}
        >
          {/* Keyed by run, so every start begins with all lights off. */}
          <Gantry key={run} out={out} label={label} />
        </m.div>
      )}
    </AnimatePresence>
  )
}

function Gantry({ out, label }: { out: boolean; label: string }) {
  const reduce = useReducedMotion()
  const lightsOut = useStartLights((s) => s.lightsOut)
  const [lit, setLit] = useState(0)
  const [held, setHeld] = useState(false)
  const ready = useAppReady()

  // Light one column at a time, then hold before the lights may go out.
  useEffect(() => {
    const step = reduce ? 0 : LIGHTS.interval
    const timers = Array.from({ length: LIGHTS.count }, (_, i) =>
      setTimeout(() => setLit(i + 1), step * (i + 1)),
    )
    timers.push(setTimeout(() => setHeld(true), step * LIGHTS.count + LIGHTS.hold))
    // Lights go out anyway on a slow network.
    timers.push(setTimeout(lightsOut, LIGHTS.maxWait))
    return () => timers.forEach(clearTimeout)
  }, [reduce, lightsOut])

  useEffect(() => {
    if (held && ready) lightsOut()
  }, [held, ready, lightsOut])

  return (
    <div className="grid justify-items-center gap-8 px-6">
      <div className="flex gap-3 sm:gap-5" aria-hidden>
        {Array.from({ length: LIGHTS.count }, (_, i) => (
          <LightColumn key={i} on={!out && lit > i} />
        ))}
      </div>
      <p className="font-mono text-caption tracking-[0.3em] text-white/60 uppercase">
        {out ? 'Lights out' : `Loading ${label}`}
      </p>
    </div>
  )
}

/** One gantry lamp in its housing. */
function LightColumn({ on }: { on: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#141518] p-2 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.06)] sm:p-3">
      <span
        className={cn(
          'relative block size-11 rounded-full bg-[#2a0d0e] sm:size-16',
          // The lit lamp and its glow fade in via opacity only.
          'after:absolute after:inset-0 after:rounded-full after:bg-[radial-gradient(circle_at_40%_35%,#ff7a70,#e62424_45%,#8c0f12)] after:opacity-0 after:shadow-[0_0_24px_6px_oklch(0.62_0.24_27/0.75),0_0_60px_12px_oklch(0.62_0.24_27/0.35)] after:transition-opacity after:duration-100',
          on && 'after:opacity-100',
        )}
      />
    </div>
  )
}

/** The app is ready when a session and a duel are chosen and no data is still loading. */
function useAppReady() {
  const hasDuel = useApp((s) => !!s.sessionId && !!s.duel)
  const fetching = useIsFetching() > 0
  return hasDuel && !fetching
}
