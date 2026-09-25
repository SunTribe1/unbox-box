'use client'

import { ArrowRightIcon, EyeIcon, MousePointerClickIcon } from 'lucide-react'
import { m } from 'motion/react'
import { WEBMCP_VISITOR_STEPS } from '@/features/help/developer-content'
import { EASE_OUT } from '@/lib/motion'
import { Crosshairs, Tag } from './decor'

export interface ToolSummary {
  name: string
  title: string
  readOnly: boolean
}

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-15% 0px' },
  transition: { duration: 0.8, ease: EASE_OUT },
} as const

const FLOW = [
  ['You ask your agent', '“Compare Norris and Piastri’s qualifying laps”'],
  ['WebMCP', 'The browser hands the agent Unbox Box’s tool list'],
  ['A typed tool call', 'compare_laps({ driverA: "NOR", driverB: "PIA" })'],
  ['The page changes', 'Lap Duel opens on both laps, as if you had clicked'],
] as const

const PROMPTS = [
  'Compare Norris and Piastri’s qualifying laps',
  'Show me turn 11 at Monza',
  'Jump the replay to lap 30',
  'Who has the most wins in the 1990s?',
]

const FAQ = [
  [
    'Which browsers support it?',
    'Chrome 146 or newer, behind a flag (step 1 above) or on sites with an origin trial. WebMCP is still a proposal, so support may change.',
  ],
  [
    'Does it cost anything?',
    'No. Unbox Box is free and has no account; you use whichever agent your browser offers.',
  ],
  [
    'Where do my questions go?',
    'To your own agent, never to us. Unbox Box has no server: the tools run in your browser on the same public data you see.',
  ],
] as const

/** How visitors can let a browser agent use Unbox Box, with the real tool catalogue. */
export function WebMcpSection({ tools }: { tools: ToolSummary[] }) {
  const acting = tools.filter((t) => !t.readOnly).length
  return (
    <section
      id="webmcp"
      aria-labelledby="agent-title"
      className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col justify-center py-24 sm:py-32"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-16 px-5 sm:px-8">
        <m.div {...reveal} className="max-w-2xl">
          <Tag>WebMCP</Tag>
          <h2 id="agent-title" className="mt-5 text-headline">
            Your AI can drive it too.
          </h2>
          <p className="mt-5 text-lead text-muted-foreground">
            WebMCP is a proposed web standard that lets an AI agent in your browser use a
            site&apos;s own tools, instead of guessing at buttons. Unbox Box registers{' '}
            {tools.length} typed tools, the same ones its buttons and the Race Engineer call, so you
            can watch every step your agent takes happen on screen.
          </p>
        </m.div>

        <m.ol {...reveal} className="grid gap-3 md:grid-cols-4" aria-label="How a request flows">
          {FLOW.map(([step, detail], i) => (
            <li
              key={step}
              className="relative rounded-2xl border border-border-accent bg-surface-1 p-5"
            >
              <span className="numeric text-caption text-signal-ink">0{i + 1}</span>
              <p className="mt-2 text-title">{step}</p>
              <p className="mt-1.5 text-sm [overflow-wrap:anywhere] text-muted-foreground">
                {detail}
              </p>
              {i < FLOW.length - 1 && (
                <ArrowRightIcon
                  className="absolute top-1/2 -right-3 z-10 hidden size-4 -translate-y-1/2 text-signal-ink md:block"
                  aria-hidden
                />
              )}
            </li>
          ))}
        </m.ol>

        <m.div {...reveal} className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
          <div className="rounded-2xl border border-border-accent bg-surface-1 p-6">
            <h3 className="text-title">Set it up</h3>
            <ol className="mt-4 grid gap-4">
              {WEBMCP_VISITOR_STEPS.map((step, i) => (
                <li key={step} className="grid grid-cols-[auto_1fr] gap-3 text-sm leading-relaxed">
                  <span className="grid size-6 place-items-center rounded-full bg-signal-soft numeric text-caption font-semibold text-signal-ink">
                    {i + 1}
                  </span>
                  <span className="min-w-0 [overflow-wrap:anywhere] text-muted-foreground">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-sm text-muted-foreground">
              Browser doesn&apos;t support WebMCP yet? The built-in Race Engineer answers the same
              questions with no setup.
            </p>
          </div>
          <div className="rounded-2xl border border-border-accent bg-surface-1 p-6">
            <h3 className="text-title">Then ask your agent</h3>
            <ul className="mt-4 grid gap-2">
              {PROMPTS.map((prompt) => (
                <li key={prompt} className="rounded-xl bg-surface-2 px-4 py-2.5 text-sm">
                  “{prompt}”
                </li>
              ))}
            </ul>
          </div>
        </m.div>

        <m.div {...reveal} className="grid gap-6 lg:grid-cols-12">
          <div className="relative rounded-2xl border border-border-accent bg-surface-1 p-6 lg:col-span-5">
            <Crosshairs />
            <h3 className="text-title">Safe by design</h3>
            <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <EyeIcon className="mt-0.5 size-4 shrink-0 text-signal-ink" aria-hidden />
                {tools.length - acting} tools only read data; {acting} change what is on screen, and
                nothing else.
              </li>
              <li className="flex gap-3">
                <MousePointerClickIcon
                  className="mt-0.5 size-4 shrink-0 text-signal-ink"
                  aria-hidden
                />
                Every call your agent makes is listed in the Race Engineer panel as it runs.
              </li>
            </ul>
          </div>
          <dl className="grid gap-4 lg:col-span-7">
            {FAQ.map(([q, a]) => (
              <div key={q} className="grid gap-1 border-b border-border pb-4 last:border-b-0">
                <dt className="text-title">{q}</dt>
                <dd className="text-sm text-muted-foreground">{a}</dd>
              </div>
            ))}
          </dl>
        </m.div>
      </div>
    </section>
  )
}
