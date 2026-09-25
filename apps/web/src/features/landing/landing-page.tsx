'use client'

import { useSyncExternalStore } from 'react'
import { AppShell } from '@/features/shell/app-shell'
import { AboutSection } from './about-section'
import { Crosshairs } from './decor'
import { Features } from './features'
import { Hero } from './hero'
import { type ToolSummary, WebMcpSection } from './webmcp-section'
import { AskSection, FinalCta, LandingFooter, LandingNav } from './sections'

/** Links from before the landing page existed (/?s=…&v=…) open the app, not the landing. */
const LEGACY_APP_LINK = /[?&](s|v|view|a|la|b|lb|t|c|rt|ht|hd|hc|hy)=/

const noSubscription = () => () => {}

/** The front page. Always dark, for the cinematic hero; the app keeps its own theme. */
export function LandingPage({ tools }: { tools: ToolSummary[] }) {
  // Read on the client only; the prerendered page is always the landing.
  const legacy = useSyncExternalStore(
    noSubscription,
    () => LEGACY_APP_LINK.test(window.location.search),
    () => false,
  )
  if (legacy) return <AppShell />
  return (
    <div className="dark relative min-h-svh overflow-x-clip bg-background text-foreground">
      {/* The layout grid, drawn: guide lines at the content edges, crosshairs at each section. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 z-10 hidden w-full max-w-6xl -translate-x-1/2 border-x border-white/[0.06] lg:block"
      />
      {/* Red light along both edges, fixed so it stays with you while you scroll. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 left-0 z-40 w-10 glow-side-left sm:w-24 lg:w-40"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 right-0 z-40 w-10 glow-side-right sm:w-24 lg:w-40"
      />
      <LandingNav />
      <main id="main">
        <Hero toolCount={tools.length} />
        <Rule />
        <Features />
        <Rule />
        <AskSection />
        <Rule />
        <WebMcpSection tools={tools} />
        <Rule />
        <AboutSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}

/** A section boundary on the layout grid: a hairline with crosshairs at the content edges. */
function Rule() {
  return (
    <div aria-hidden className="relative mx-auto h-px max-w-6xl bg-white/[0.06]">
      {/* The crosshairs sit on the guide lines, which only show when there is room either side. */}
      <Crosshairs className="hidden lg:block" />
    </div>
  )
}
