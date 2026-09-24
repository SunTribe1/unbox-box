'use client'

import { clamp, formatRaceTime, timeOfLap, type Replay } from '@unbox-box/tools'
import { useEffect, useRef } from 'react'
import { HelpText } from '@/components/help-text'
import { useApp, usePlayback } from '@/lib/store'

const HEIGHT = 64

/** Race timeline: lap ticks, safety car periods, pit stops and race control notes, with a
 *  draggable playhead. Keyboard: arrows ±10 s, Shift+arrows ±1 lap, Home/End. */
export function Timeline({ replay }: { replay: Replay }) {
  const ref = useRef<HTMLDivElement>(null)
  const head = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const duel = useApp((s) => s.duel)
  const focus = usePlayback((s) => s.focus)
  const duration = replay.duration
  const pct = (t: number) => `${(clamp(t, 0, duration) / duration) * 100}%`

  useEffect(
    () =>
      usePlayback.subscribe(
        (s) => s.time,
        (t) => {
          if (head.current) head.current.style.left = pct(t)
          if (label.current) label.current.textContent = formatRaceTime(t)
          ref.current?.setAttribute('aria-valuenow', String(Math.round(t)))
          ref.current?.setAttribute('aria-valuetext', formatRaceTime(t))
        },
        { fireImmediately: true },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duration],
  )

  const seekFromPointer = (clientX: number) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const f = clamp((clientX - box.left) / box.width, 0, 1)
    usePlayback.getState().seek(f * duration)
  }

  const lapLen = duration / replay.totalLaps
  const onKey = (e: React.KeyboardEvent) => {
    const { time, seek } = usePlayback.getState()
    const step = e.shiftKey ? lapLen : 10
    if (e.key === 'ArrowRight') seek(Math.min(duration, time + step))
    else if (e.key === 'ArrowLeft') seek(time - step)
    else if (e.key === 'Home') seek(0)
    else if (e.key === 'End') seek(duration)
    else return
    e.preventDefault()
  }

  const lapTicks = Array.from({ length: replay.totalLaps }, (_, i) => i + 1)
  const notable = replay.messages.filter((m) => /INVESTIGATION|PENALTY|INCIDENT/.test(m.message))
  const highlight = new Set([duel?.a, duel?.b, focus].filter(Boolean))

  return (
    <div className="select-none">
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Race time"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(usePlayback.getState().time)}
        className="relative cursor-pointer touch-none rounded-none border bg-surface-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ height: HEIGHT }}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          seekFromPointer(e.clientX)
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) seekFromPointer(e.clientX)
        }}
      >
        {replay.trackStatus.map((s) => (
          <div
            key={s.from}
            className={
              s.status === 'red'
                ? 'absolute inset-y-0 bg-danger/25'
                : 'absolute inset-y-0 bg-tyre-medium/20'
            }
            style={{ left: pct(s.from), width: `calc(${pct(s.to)} - ${pct(s.from)})` }}
            title={s.status.toUpperCase()}
          />
        ))}
        {lapTicks.map((lap) => {
          const t = timeOfLap(replay, lap)
          const major = lap === 1 || lap % 5 === 0
          return (
            <div key={lap} className="absolute top-0 bottom-0" style={{ left: pct(t) }}>
              <div className={major ? 'h-full w-px bg-border' : 'mt-auto h-2 w-px bg-border'} />
              {major && (
                <span className="absolute top-1 left-1 font-mono text-[10px] text-faint-foreground">
                  {lap === 1 ? 'L1' : lap}
                </span>
              )}
            </div>
          )
        })}
        {replay.pits.map((p) =>
          p.in == null ? null : (
            <div
              key={`${p.driver}-${p.lap}`}
              className="absolute bottom-2 -translate-x-1/2"
              style={{ left: pct(p.in) }}
              title={`${p.driver} pits, lap ${p.lap}`}
            >
              <div
                className={
                  highlight.has(p.driver)
                    ? duel?.a === p.driver
                      ? 'h-4 w-1 rounded-full bg-driver-a'
                      : duel?.b === p.driver
                        ? 'h-4 w-1 rounded-full bg-driver-b'
                        : 'h-4 w-1 rounded-full bg-signal'
                    : 'h-2.5 w-0.5 rounded-full bg-faint-foreground/60'
                }
              />
            </div>
          ),
        )}
        {notable.map((m) => (
          <div
            key={`${m.t}-${m.message}`}
            className="absolute top-5 size-1.5 -translate-x-1/2 rounded-full bg-signal"
            style={{ left: pct(m.t) }}
            title={m.message}
          />
        ))}
        <div ref={head} className="pointer-events-none absolute inset-y-0 -ml-px w-0.5 bg-signal">
          <div className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-signal" />
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-faint-foreground">
        <span>
          <span ref={label} className="numeric text-foreground" /> race time
        </span>
        <HelpText as="div" className="hidden sm:flex">
          Tall ticks: pit stops of highlighted drivers · dots: incidents · ←/→ ±10 s, ⇧ ±1 lap
        </HelpText>
      </div>
    </div>
  )
}
