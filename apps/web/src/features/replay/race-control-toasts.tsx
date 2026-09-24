'use client'

import { formatRaceControl, type Replay } from '@unbox-box/tools'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { usePlayback } from '@/lib/store'

/** The race-control calls worth interrupting for: flags that stop or end the race, safety
 *  cars and penalties. Track-limit deletions and sector yellows stay in the feed. */
const WORTH_A_TOAST = /SAFETY CAR|RED FLAG|CHEQUERED|PENALTY|DISQUALIF|RACE WILL (RE)?START/
const MIN_GAP_MS = 2500 // at 64x a burst of messages would otherwise stack up

/** Shows important race-control messages as toasts while the replay plays. */
export function useRaceControlToasts(replay: Replay | undefined) {
  useEffect(() => {
    if (!replay) return
    const important = replay.messages.filter((m) => WORTH_A_TOAST.test(m.message))
    let last = usePlayback.getState().time
    let lastToast = 0
    return usePlayback.subscribe((s) => {
      const now = s.time
      const from = last
      last = now
      // Only forward play: seeking back or jumping ahead shouldn't replay a pile of calls.
      if (!s.playing || now < from || now - from > 30) return
      const hit = important.findLast((m) => m.t > from && m.t <= now)
      if (!hit || Date.now() - lastToast < MIN_GAP_MS) return
      lastToast = Date.now()
      toast(formatRaceControl(hit.message), {
        description: `Race control · lap ${hit.lap ?? '–'}`,
        duration: 4000,
      })
    })
  }, [replay])
}
