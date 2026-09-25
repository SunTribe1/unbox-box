'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon } from 'lucide-react'
import { m, type Variants } from 'motion/react'
import { Button } from '@/components/ui/button'
import { indexQuery } from '@/lib/data'
import { Brackets, Grain } from './decor'
import { HeroCanvas } from './hero-canvas'
import { EASE_OUT } from '@/lib/motion'
import { useEnterApp } from './use-enter-app'

const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.09, duration: 0.7, ease: EASE_OUT },
  }),
}

export function Hero({ toolCount }: { toolCount: number }) {
  const enter = useEnterApp()
  return (
    <section className="relative isolate flex min-h-[92svh] items-center overflow-hidden bg-brand-ink text-white">
      <div className="absolute inset-0 -z-10">
        <HeroCanvas />
        {/* Edge shading keeps the headline readable over the halftone track; grain for film. */}
        <div className="absolute inset-0 bg-[radial-gradient(90%_75%_at_12%_55%,#0a0a0b_30%,transparent_72%)]" />
        <Grain />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,var(--background),transparent)]" />
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 pt-28 pb-[min(92vw,390px)] sm:px-8 lg:pb-24">
        <div className="lg:max-w-[50%]">
          <m.h1
            custom={1}
            variants={rise}
            initial="hidden"
            animate="show"
            className="max-w-[9ch] text-hero"
          >
            Every lap, unboxed.
          </m.h1>
          <m.p
            custom={2}
            variants={rise}
            initial="hidden"
            animate="show"
            className="mt-6 text-lead max-w-xl text-white/70"
          >
            Put two laps side by side, replay a whole race, test a pit strategy, or dig through
            every Grand Prix since 1950. Ask in plain English, or let your AI agent drive.
          </m.p>
          <m.div
            custom={3}
            variants={rise}
            initial="hidden"
            animate="show"
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Button variant="signal" size="lg" shape="pill" onClick={() => enter('/duel/')}>
              Lights out: start a lap duel
              <ArrowRightIcon className="size-4" aria-hidden />
            </Button>
            <Button variant="outline" size="lg" shape="pill" onClick={() => enter('/replay/')}>
              Watch a race replay
            </Button>
          </m.div>
          <m.div custom={4} variants={rise} initial="hidden" animate="show">
            <Stats toolCount={toolCount} />
          </m.div>
        </div>
      </div>
    </section>
  )
}

/** Real numbers only: counted from the live data index and the tool registry. */
function Stats({ toolCount }: { toolCount: number }) {
  const index = useQuery(indexQuery())
  const sessions = index.data?.sessions.length
  const seasons = index.data?.sessions.map((s) => s.season) ?? []
  const latest = seasons.length ? Math.max(...seasons) : undefined
  const first = seasons.length ? Math.min(...seasons) : undefined
  // Two data sets: car telemetry (recent seasons) and results for every season since 1950.
  const items: [string, string | number | undefined][] = [
    [first ? `Telemetry sessions, ${first}–now` : 'Telemetry sessions', sessions],
    ['Seasons of results, 1950–now', latest ? latest - 1949 : undefined],
    ['Tools for AI agents', toolCount],
  ]
  return (
    <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-3 sm:gap-4">
      {items.map(([label, value]) => (
        <div key={label} className="relative grid gap-2 px-3 py-3 sm:px-4 sm:py-4">
          <Brackets />
          <dt className="order-2 text-eyebrow text-white/55">{label}</dt>
          <dd className="order-1 numeric text-subhead">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
