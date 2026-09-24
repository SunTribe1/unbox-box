'use client'

import { useIsFetching } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { duration } from '@/lib/motion'

/** A thin amber line under the top bar while data loads. It waits 150 ms before showing so
 *  cached loads never flash it. */
export function FetchProgress() {
  const fetching = useIsFetching() > 0
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
      <AnimatePresence>
        {fetching && (
          <m.div
            key="bar"
            role="progressbar"
            aria-label="Loading data"
            className="h-full w-1/3 bg-[linear-gradient(90deg,transparent,var(--signal),transparent)]"
            initial={{ opacity: 0, x: '-100%' }}
            animate={{
              opacity: 1,
              x: ['-100%', '300%'],
              transition: {
                opacity: { delay: 0.15, duration: duration.fast },
                x: { delay: 0.15, duration: 1.1, ease: 'easeInOut', repeat: Infinity },
              },
            }}
            exit={{ opacity: 0, transition: { duration: duration.base } }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
