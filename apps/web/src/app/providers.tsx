'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { domMax, LazyMotion, MotionConfig } from 'motion/react'
import { ThemeProvider } from 'next-themes'
import type * as React from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { queryClient } from '@/lib/data'
import { StartLights } from '@/features/start-lights/start-lights'
import { ServiceWorker } from './service-worker'

export function Providers({ children }: { children: React.ReactNode }) {
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
