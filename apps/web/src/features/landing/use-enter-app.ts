'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useStartLights } from '@/features/start-lights/store'

/** What each entry point loads, for the lights' label. */
const DESTINATION: Record<string, string> = {
  '/duel/': 'Lap Duel',
  '/replay/': 'Race Replay',
  '/strategy/': 'Strategy Lab',
  '/races/': 'the archive',
}

/** Go from the landing page into the app behind the start lights. The lights overlay lives in
 *  the providers, so it stays up while the app page loads its data. */
export function useEnterApp() {
  const router = useRouter()
  const start = useStartLights((s) => s.start)
  return useCallback(
    (href: string) => {
      start(DESTINATION[href] ?? 'Unbox Box')
      router.push(href)
    },
    [router, start],
  )
}
