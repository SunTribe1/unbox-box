import { ArrowLeftIcon, FileTextIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Wordmark } from '@/features/shell/logo'
import {
  ASSETS,
  ATTRIBUTIONS,
  BUILD_TOOLS,
  DATA,
  DEV_TOOLS,
  SERVICES,
  SOFTWARE,
  STORAGE,
  type Credit,
} from './credits'

export const metadata: Metadata = {
  title: 'Credits and licences · Unbox Box',
  description:
    'Every data source, library, font, flag and service Unbox Box uses, with its licence.',
}

/** One tile of the bento grid. `span` sets its width at each breakpoint. */
function Tile({
  title,
  description,
  span,
  children,
  className,
}: {
  title: string
  description?: React.ReactNode
  span: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn('min-w-0', span, className)}>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent className="grid content-start gap-3">{children}</CardContent>
    </Card>
  )
}

function Licence({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
      {children}
    </span>
  )
}

function CreditLink({ c }: { c: Credit }) {
  return (
    <a href={c.href} className="underline-offset-4 hover:underline">
      {c.name}
    </a>
  )
}

/** Name, licence and (when there is one) a note, for the larger tiles. */
function CreditCards({ items, columns }: { items: Credit[]; columns: string }) {
  return (
    <ul className={cn('grid gap-3', columns)}>
      {items.map((c) => (
        <li key={c.name} className="grid content-start gap-1.5 rounded-lg bg-surface-2/50 p-3">
          <span className="flex items-start justify-between gap-2 text-sm font-medium">
            <CreditLink c={c} />
            <Licence>{c.license}</Licence>
          </span>
          {c.note && <span className="text-caption text-muted-foreground">{c.note}</span>}
        </li>
      ))}
    </ul>
  )
}

/** Name and licence on one line, for long lists. */
function CreditRows({ items, columns = '' }: { items: Credit[]; columns?: string }) {
  return (
    <ul className={cn('grid gap-x-6', columns)}>
      {items.map((c) => (
        <li
          key={c.name}
          className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0"
        >
          <CreditLink c={c} />
          <Licence>{c.license}</Licence>
        </li>
      ))}
    </ul>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
}

const ALL = [...DATA, ...SERVICES, ...ASSETS, ...SOFTWARE, ...BUILD_TOOLS, ...DEV_TOOLS]
const LICENCE_TYPES = new Set(
  ALL.flatMap((c) => c.license.split('·').map((l) => l.trim())).filter(
    (l) => !/terms|credit/i.test(l),
  ),
)

const STATS: [value: number, label: string][] = [
  [DATA.length, 'data sources'],
  [SOFTWARE.length + ASSETS.length, 'libraries, fonts and icon sets in the site'],
  [BUILD_TOOLS.length + DEV_TOOLS.length, 'build and test tools'],
  [LICENCE_TYPES.size, 'kinds of open licence'],
]

export default function CreditsPage() {
  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-6 md:py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden /> Back to Unbox Box
      </Link>

      <div className="grid gap-4 md:grid-cols-6 xl:grid-cols-12">
        <Card className="md:col-span-6 xl:col-span-12">
          <CardContent className="grid gap-6 pt-5 sm:pt-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
            <div className="grid gap-3">
              <div className="grid gap-3">
                <Wordmark className="w-40 text-foreground" />
                <h1 className="text-display">Credits and licences</h1>
              </div>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Unbox Box is a free, non-commercial fan project built on open data and open-source
                software. Everything it uses is listed here with its licence. Thank you to everyone
                below.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <a
                  href="/data/DATA_LICENSE.md"
                  className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 hover:bg-surface-2"
                >
                  <FileTextIcon className="size-4" aria-hidden /> DATA_LICENSE.md
                </a>
                <a
                  href="/THIRD_PARTY_NOTICES.txt"
                  className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 hover:bg-surface-2"
                >
                  <FileTextIcon className="size-4" aria-hidden /> THIRD_PARTY_NOTICES.txt
                </a>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-2">
              {STATS.map(([value, label]) => (
                <div key={label} className="grid gap-1 rounded-lg bg-surface-2 px-3 py-3">
                  <dt className="order-2 text-caption text-muted-foreground">{label}</dt>
                  <dd className="numeric text-2xl leading-none font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Tile
          title="Data"
          description="Where every number comes from, and what we changed"
          span="md:col-span-6 xl:col-span-8"
        >
          <CreditCards items={DATA} columns="sm:grid-cols-2" />
        </Tile>

        <Tile
          title="Services"
          description="What the site talks to"
          span="md:col-span-6 xl:col-span-4"
        >
          <CreditCards items={SERVICES} columns="" />
        </Tile>

        <Tile
          title="Software"
          description="Libraries shipped in the site"
          span="md:col-span-6 xl:col-span-6"
        >
          <CreditRows items={SOFTWARE} columns="sm:grid-cols-2" />
        </Tile>

        <Tile
          title="Build and test tools"
          description="Used to make the site, not part of it"
          span="md:col-span-6 xl:col-span-6"
        >
          <CreditRows items={[...BUILD_TOOLS, ...DEV_TOOLS]} columns="sm:grid-cols-2" />
        </Tile>

        <Tile
          title="Flags, fonts and icons"
          description="The motorsport icons and logo are Unbox Box’s own"
          span="md:col-span-6 xl:col-span-4"
        >
          <CreditRows items={ASSETS} />
        </Tile>

        <Tile
          title="Attribution statements"
          description="In the form each data licence asks for"
          span="md:col-span-6 xl:col-span-8"
        >
          <ul className="grid gap-2 text-sm leading-relaxed text-muted-foreground">
            {ATTRIBUTIONS.map((a) => (
              <li key={a} className="rounded-lg bg-surface-2/50 px-3 py-2.5">
                {a}
              </li>
            ))}
          </ul>
        </Tile>

        <Tile
          title="Privacy"
          description="No account, no cookies, no analytics, no tracking"
          span="md:col-span-6 xl:col-span-6"
        >
          <Prose>
            <p>
              Unbox Box talks to other services only to load its data files, and to Web3Forms only
              when you send a report (just what the form shows). Your browser keeps these settings
              on your device:
            </p>
          </Prose>
          <dl className="grid gap-1.5">
            {STORAGE.map(([key, what]) => (
              <div
                key={key}
                className="grid gap-x-4 border-b border-border/60 pb-1.5 text-sm last:border-0 sm:grid-cols-[13rem_1fr]"
              >
                <dt className="font-mono text-xs text-foreground">{key}</dt>
                <dd className="text-muted-foreground">{what}</dd>
              </div>
            ))}
          </dl>
        </Tile>

        <Tile title="Our own work" span="md:col-span-3 xl:col-span-3">
          <Prose>
            <p>
              Unbox Box&apos;s code, logo and motorsport icons are original work, released under the{' '}
              <a
                href="https://opensource.org/license/mit"
                className="text-foreground underline underline-offset-4"
              >
                MIT License
              </a>
              .
            </p>
            <p>
              Reusing our data files? They keep their sources&apos; licences, so credit F1DB and
              TracingInsights as well as Unbox Box.
            </p>
          </Prose>
        </Tile>

        <Tile title="Names, colours and images" span="md:col-span-3 xl:col-span-3">
          <Prose>
            <p>
              Driver, team, circuit and event names are used only to identify them, as facts. Team
              colours are our own approximations for telling cars apart on charts.
            </p>
            <p>
              Unbox Box uses no official photographs, logos, liveries, broadcast footage or audio,
              and no affiliate or sponsored links.
            </p>
          </Prose>
        </Tile>

        <Tile title="Disclaimer" span="md:col-span-6 xl:col-span-12">
          <Prose>
            <p>
              Unbox Box is unofficial and is not associated in any way with the Formula 1 companies.
              It is not endorsed or sponsored by Formula One World Championship Limited, Formula One
              Management, Formula One Licensing B.V., the FIA or any team.
            </p>
            <p>
              F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related
              marks are trademarks of Formula One Licensing B.V.
            </p>
          </Prose>
        </Tile>

        <Card className="md:col-span-6 xl:col-span-12">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5 text-sm sm:pt-6">
            <span className="text-muted-foreground">
              Think something is missing a credit, or used without the right licence?
            </span>
            <Link
              href="/help/#feedback"
              className="rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary/90"
            >
              Tell us and we&apos;ll fix it
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
