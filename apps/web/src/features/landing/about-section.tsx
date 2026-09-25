'use client'

import { m } from 'motion/react'
import { ASSETS, type Credit, DATA, SERVICES, SOFTWARE } from '@/app/credits/credits'
import { EASE_OUT } from '@/lib/motion'
import { REPO_URL } from '@/lib/site'
import { ArrowLink, Crosshairs, Tag } from './decor'

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-15% 0px' },
  transition: { duration: 0.8, ease: EASE_OUT },
} as const

const FACTS = [
  ['Free and non-commercial', 'No ads, no sponsors, no affiliate links, no paid tier.'],
  ['Open source', 'MIT-licensed code on GitHub. Issues and pull requests welcome.'],
  ['Private by default', 'No account, no cookies, no analytics, no tracking.'],
  ['Built on open data', 'Every number comes from openly licensed sources, credited below.'],
] as const

/** Who made this and why, and thanks to everyone whose work it stands on. The lists are the
 *  Credits page's own data (app/credits/credits.ts), so the two never disagree. */
export function AboutSection() {
  return (
    <section
      id="about"
      aria-labelledby="about-title"
      className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col justify-center py-24 sm:py-32"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-16 px-5 sm:px-8">
        <m.div {...reveal} className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Tag>About</Tag>
            <h2 id="about-title" className="mt-5 text-headline">
              A hobby project, built by a Formula 1 fan.
            </h2>
            <p className="mt-5 text-lead text-muted-foreground">
              Unbox Box is a hobby project, built and looked after by a Formula 1 fan in their spare
              time, for other fans who want to see what really happens between two laps. It is
              unofficial and not associated in any way with the Formula 1 companies.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
              <ArrowLink href={REPO_URL}>View the code on GitHub</ArrowLink>
              <ArrowLink href="/credits/">Credits and full disclaimer</ArrowLink>
            </div>
          </div>
          <dl className="grid content-start gap-4 sm:grid-cols-2 lg:col-span-6">
            {FACTS.map(([title, body]) => (
              <div
                key={title}
                className="relative rounded-2xl border border-border-accent bg-surface-1 p-5"
              >
                <Crosshairs />
                <dt className="text-title">{title}</dt>
                <dd className="mt-1.5 text-sm text-muted-foreground">{body}</dd>
              </div>
            ))}
          </dl>
        </m.div>

        <m.div {...reveal}>
          <h3 className="text-subhead">Thank you</h3>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Unbox Box stands on other people&apos;s open work. Each licence, and what we changed, is
            on the Credits page.
          </p>
          <div className="mt-8 grid items-start gap-6 md:grid-cols-2">
            <CreditGroup title="Data" credits={DATA} />
            <CreditGroup title="Services" credits={SERVICES} />
            <CreditGroup title="Fonts, icons and flags" credits={ASSETS} />
            <CreditGroup title="Software" credits={SOFTWARE} />
          </div>
        </m.div>
      </div>
    </section>
  )
}

function CreditGroup({ title, credits }: { title: string; credits: Credit[] }) {
  return (
    <div className="rounded-2xl border border-border-accent bg-surface-1 p-5">
      <h4 className="text-title">{title}</h4>
      <ul className="mt-3 flex flex-wrap gap-2">
        {credits.map((c) => (
          <li key={c.name}>
            <a
              href={c.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm transition-colors hover:border-signal/50 hover:text-signal-ink"
            >
              {c.name}
              <span className="text-caption text-faint-foreground">{c.license}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
