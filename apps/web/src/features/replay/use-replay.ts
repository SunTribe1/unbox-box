'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { replayQuery } from '@/lib/data'
import { useApp, usePlayback } from '@/lib/store'

export function useReplayData() {
  const sessionId = useApp((s) => s.sessionId) ?? ''
  return useQuery({ ...replayQuery(sessionId), enabled: !!sessionId })
}

/** Replay time, re-rendered at most every `ms` (the canvas reads the clock every frame
 *  on its own; tables and labels don't need to). */
export function useThrottledTime(ms = 200): number {
  const [time, setTime] = useState(() => usePlayback.getState().time)
  useEffect(() => {
    let last = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    return usePlayback.subscribe(
      (s) => s.time,
      (t) => {
        const now = performance.now()
        clearTimeout(timer)
        if (now - last >= ms) {
          last = now
          setTime(t)
        } else {
          timer = setTimeout(() => setTime(usePlayback.getState().time), ms)
        }
      },
    )
  }, [ms])
  return time
}

/** Advances the replay clock while playing. */
export function usePlaybackLoop(duration: number | undefined) {
  const playing = usePlayback((s) => s.playing)
  useEffect(() => {
    if (!playing || !duration) return
    let frame = 0
    let prev = performance.now()
    const tick = (now: number) => {
      const { time, speed, seek, set } = usePlayback.getState()
      const next = time + ((now - prev) / 1000) * speed
      prev = now
      if (next >= duration) {
        seek(duration)
        set({ playing: false })
        return
      }
      seek(next)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, duration])
}
