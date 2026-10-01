'use client'

import { useSyncExternalStore } from 'react'
import { AppShell } from '@/features/shell/app-shell'
import { AboutSection } from './about-section'
import { Features } from './features'
import { Grain } from './decor'
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
      {/* The layout grid, drawn faintly: guide lines at the content edges. Fixed to the screen
          and faded at the top and bottom, so they never end in a hard edge while scrolling. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 left-1/2 z-10 hidden w-full max-w-6xl -translate-x-1/2 border-x border-white/[0.05] [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)] lg:block"
      />
      {/* Red light along both edges, fixed so it stays with you while you scroll. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 left-0 z-40 w-16 glow-side-left sm:w-40 lg:w-[min(26vw,420px)]"
      >
        <Grain className="[mask-image:linear-gradient(to_right,black,transparent)]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 right-0 z-40 w-16 glow-side-right sm:w-40 lg:w-[min(26vw,420px)]"
      >
        <Grain className="[mask-image:linear-gradient(to_left,black,transparent)]" />
      </div>
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

/** A section boundary: a hairline that fades out towards both ends, so it has no hard edge. */
function Rule() {
  return (
    <div
      aria-hidden
      className="mx-auto h-px max-w-6xl bg-[linear-gradient(to_right,transparent,rgb(255_255_255/0.07)_30%,rgb(255_255_255/0.07)_70%,transparent)]"
    />
  )
}
