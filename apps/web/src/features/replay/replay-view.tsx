'use client'

import { m } from 'motion/react'
import { useEffect } from 'react'
import { DataQualityNote } from '@/components/data-quality-note'
import { HelpText } from '@/components/help-text'
import { Card, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useApp, usePlayback } from '@/lib/store'
import { enter } from '@/lib/motion'
import { ErrorState } from '@/components/ui/error-state'
import { useSessionMeta } from '../lap-duel/use-duel'
import { PlaybackControls } from './playback-controls'
import { RaceControlFeed } from './race-control-feed'
import { FollowHud } from './follow-hud'
import { useRaceControlToasts } from './race-control-toasts'
import { RejoinCard } from './rejoin-card'
import { Timeline } from './timeline'
import { TimingTower } from './timing-tower'
import { TrackCanvas } from './track-canvas'
import { usePlaybackLoop, useReplayData } from './use-replay'

export function ReplayView() {
  const meta = useSessionMeta()
  const replay = useReplayData()
  usePlaybackLoop(replay.data?.duration)
  useRaceControlToasts(replay.data)

  // Leaving the view pauses the replay.
  useEffect(() => () => usePlayback.getState().set({ playing: false }), [])

  // Space plays/pauses; arrows step 10 s (Shift: a lap). Ignored while typing, in dialogs,
  // and when the timeline slider has focus (it handles its own keys).
  const duration = replay.data?.duration
  const laps = replay.data?.totalLaps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
        return
      if (target.getAttribute('role') === 'slider' || useApp.getState().paletteOpen) return
      if (document.querySelector('[role=dialog]')) return
      const p = usePlayback.getState()
      if (e.key === ' ' && target.tagName !== 'BUTTON') {
        e.preventDefault()
        p.set({ playing: !p.playing })
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && duration && laps) {
        e.preventDefault()
        const step = (e.shiftKey ? duration / laps : 10) * (e.key === 'ArrowLeft' ? -1 : 1)
        p.seek(Math.min(duration, Math.max(0, p.time + step)))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [duration, laps])

  const error = meta.error ?? replay.error
  if (error) {
    return <ErrorState title="Replay unavailable" error={error} />
  }
  if (!meta.data || !replay.data) {
    return (
      <div className="grid gap-4" aria-busy aria-label="Loading race replay">
        <Skeleton className="h-9 w-full max-w-xl" />
        <div className="grid gap-4 @min-[900px]:grid-cols-[minmax(0,1fr)_300px]">
          <Skeleton className="h-[520px] rounded-xl" />
          <Skeleton className="h-[520px] rounded-xl" />
        </div>
        <Skeleton className="h-16 rounded-lg" />
      </div>
    )
  }

  return (
    <m.div className="grid gap-4" {...enter}>
      <PlaybackControls replay={replay.data} />
      <div className="grid gap-4 @min-[900px]:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid content-start gap-4">
          <Card className="overflow-hidden">
            <TrackCanvas meta={meta.data} replay={replay.data} />
            <CardFooter className="grid gap-1.5">
              <DataQualityNote meta={meta.data} />
              <HelpText>
                Tagged in team colours: the leader (P1), your two Lap Duel drivers and the car you
                follow. Tap a driver in Timing to follow them.
              </HelpText>
            </CardFooter>
          </Card>
          <Timeline replay={replay.data} />
          <RaceControlFeed replay={replay.data} />
        </div>
        <div className="grid content-start gap-4">
          <FollowHud meta={meta.data} replay={replay.data} />
          <TimingTower meta={meta.data} replay={replay.data} />
          <RejoinCard meta={meta.data} replay={replay.data} />
        </div>
      </div>
    </m.div>
  )
}
