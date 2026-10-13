'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { domMax, LazyMotion, MotionConfig } from 'motion/react'
import { ThemeProvider } from 'next-themes'
import type * as React from 'react'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient } from '@/lib/data'
import { StartLights } from '@/features/start-lights/start-lights'
import { ServiceWorker } from './service-worker'

/** Marks <html data-hydrated> a frame after hydration, once content that only the browser can
 *  render (the session's example questions) is in. Tests wait for it before checking a page. */
function useHydratedMarker() {
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.documentElement.dataset.hydrated = ''
    })
    return () => cancelAnimationFrame(frame)
  }, [])
}

export function Providers({ children }: { children: React.ReactNode }) {
  useHydratedMarker()
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <LazyMotion features={domMax} strict>
          <MotionConfig reducedMotion="user">
            <TooltipProvider>
              {children}
              <StartLights />
              <Toaster position="bottom-center" />
              <ServiceWorker />
            </TooltipProvider>
          </MotionConfig>
        </LazyMotion>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
