'use client'

import { ArrowRightIcon } from 'lucide-react'
import { m } from 'motion/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/features/shell/logo'
import { DISCLAIMER_SHORT } from '@/lib/legal'
import { REPO_URL } from '@/lib/site'
import { EASE_OUT } from '@/lib/motion'
import { AppWindow, Tag } from './decor'
import { LoopVideo } from './loop-video'
import { useEnterApp } from './use-enter-app'

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-15% 0px' },
  transition: { duration: 0.8, ease: EASE_OUT },
} as const

export function LandingNav() {
  const enter = useEnterApp()
  return (
    <header className="glow-rim fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#0a0a0b]">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8"
      >
        <Link href="/" aria-label="Unbox Box home" className="text-white">
          <Wordmark className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <a
            href="#features"
            className="glow-underline hidden rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:text-white md:block"
          >
            Features
          </a>
          <a
            href="#ask"
            className="glow-underline hidden rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:text-white md:block"
          >
            Race Engineer
          </a>
          <a
            href="#webmcp"
            className="glow-underline hidden rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:text-white md:block"
          >
            WebMCP
          </a>
          <a
            href="#about"
            className="glow-underline hidden rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:text-white md:block"
          >
            About
          </a>
          <Button variant="signal" size="sm" shape="pill" onClick={() => enter('/duel/')}>
            Open the app
          </Button>
        </div>
      </nav>
    </header>
  )
}

const QUESTIONS = [
  'Where did Piastri lose time to Norris?',
  'Who was leading on lap 30?',
  'Most wins in the 90s',
  'Tell me about Jim Clark',
  'Show me turn 11',
]

export function AskSection() {
  return (
    <section
      id="ask"
      aria-labelledby="ask-title"
      className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col justify-center bg-surface-1 py-24 sm:py-32"
    >
      <m.div
        {...reveal}
        className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-12"
      >
        <div className="lg:col-span-5">
          <Tag>Race Engineer</Tag>
          <h2 id="ask-title" className="mt-5 text-headline">
            Ask what you&apos;d ask your race engineer.
          </h2>
          <p className="mt-5 text-lead text-muted-foreground">
            Plain-English questions become typed tool calls, answered instantly in your browser with
            no account and no API key. The page changes as it works, so you see where each answer
            comes from.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {QUESTIONS.map((q) => (
              <li
                key={q}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground"
              >
                “{q}”
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-7">
          <AppWindow title="Race Engineer">
            <LoopVideo
              src="/landing/race-engineer.webm"
              poster="/landing/race-engineer.jpg"
              label="The Race Engineer answering “Where did Piastri lose time to Norris?” with tool calls, while Lap Duel highlights the corner"
            />
          </AppWindow>
        </div>
      </m.div>
    </section>
  )
}

export function FinalCta() {
  const enter = useEnterApp()
  return (
    <section
      aria-labelledby="final-title"
      className="relative isolate flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col justify-center overflow-hidden bg-brand-ink py-28 text-center text-white sm:py-36"
    >
      <div className="absolute inset-0 -z-10 glow-floor" />
      <m.div {...reveal} className="mx-auto max-w-2xl px-5">
        <h2 id="final-title" className="text-headline">
          Lights out. Data on.
        </h2>
        <p className="mt-5 text-lead text-white/70">
          Start analysing: every session since 2023, every Grand Prix since 1950.
        </p>
        <Button
          variant="signal"
          size="lg"
          shape="pill"
          className="mt-9"
          onClick={() => enter('/duel/')}
        >
          Start a lap duel <ArrowRightIcon className="size-4" aria-hidden />
        </Button>
      </m.div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border-accent py-10 text-caption text-faint-foreground">
      <div className="mx-auto grid max-w-6xl gap-4 px-5 sm:px-8">
        <p>
          {DISCLAIMER_SHORT} All other names are trade marks of their respective owners, who do not
          endorse this app.
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/credits/" className="underline underline-offset-2 hover:text-foreground">
            Credits and full disclaimer
          </Link>
          <Link href="/help/" className="underline underline-offset-2 hover:text-foreground">
            Help
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            GitHub
          </a>
        </p>
      </div>
    </footer>
  )
}
