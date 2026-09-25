'use client'

import { PauseIcon, PlayIcon } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

/** A silent screen recording of the app: plays only while on screen, can be paused (WCAG
 *  2.2.2: moving content over five seconds needs a pause), and stays a still for reduced
 *  motion. The poster is a screenshot of the same view, so there is never a blank frame. */
export function LoopVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const video = useRef<HTMLVideoElement>(null)
  const reduce = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const stopped = paused || !!reduce

  useEffect(() => {
    const el = video.current
    if (!el || stopped) {
      el?.pause()
      return
    }
    const seen = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.35 },
    )
    seen.observe(el)
    return () => seen.disconnect()
  }, [stopped])

  return (
    <div className="relative">
      <video
        ref={video}
        src={src}
        poster={poster}
        aria-label={label}
        muted
        loop
        playsInline
        preload="none"
        width={1280}
        height={800}
        className="h-auto w-full rounded-xl bg-surface-2"
      />
      {!reduce && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? `Play: ${label}` : `Pause: ${label}`}
          className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full border border-white/15 bg-black/70 text-white transition-colors hover:bg-black/90"
        >
          {paused ? (
            <PlayIcon className="size-4" aria-hidden />
          ) : (
            <PauseIcon className="size-4" aria-hidden />
          )}
        </button>
      )}
    </div>
  )
}
