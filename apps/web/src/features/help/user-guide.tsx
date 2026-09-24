'use client'

import { ArrowRightIcon } from 'lucide-react'
import type * as React from 'react'
import { CompoundTyre } from '@/components/icons/compound-tyre'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { goTo, NAV } from '../shell/nav'
import { SHORTCUT_GROUPS } from '../shell/shortcuts-dialog'
import { FeedbackForm } from './feedback-form'
import { GLOSSARY, GUIDES, RESULT_CODES } from './help-content'
import { LegendRow, Section, Swatch, Terms } from './help-parts'

export const USER_SECTIONS = [
  ['start', 'Start here'],
  ['sections', 'The sections'],
  ['legend', 'Colours and marks'],
  ['glossary', 'Glossary'],
  ['shortcuts', 'Keyboard shortcuts'],
  ['data', 'About the data'],
  ['feedback', 'Report a bug or idea'],
] as const

/** How to use Unbox Box: first steps, every section, colours, terms, shortcuts, the data
 *  and the report form. */
export function UserGuide() {
  return (
    <>
      <Section id="start" title="Start here">
        <ol className="grid gap-3 @min-[700px]:grid-cols-2 @min-[1200px]:grid-cols-4">
          {[
            [
              'Pick a session',
              'The top bar holds the Grand Prix and session (practice, qualifying, sprint or race). Every session view follows it.',
            ],
            [
              'Choose a section',
              'The rail on the left (the bottom bar on a phone) switches pages. Session tools come first, then the archive back to 1950.',
            ],
            [
              'Follow the names',
              'Any driver, team, circuit or race name opens its page, so you can wander from a result to a career to a country.',
            ],
            [
              'Ask or share',
              'Ask the Race Engineer a question in plain English, or copy the link: it opens exactly what you see.',
            ],
          ].map(([title, body], i) => (
            <li key={title} className="grid content-start gap-1.5 rounded-xl bg-surface-2/60 p-4">
              <span className="numeric text-label text-muted-foreground">Step {i + 1}</span>
              <span className="font-medium">{title}</span>
              <span className="text-sm text-muted-foreground">{body}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="sections"
        title="The sections"
        description="What each page answers and how to get the most from it."
      >
        <div className="grid gap-3 @min-[900px]:grid-cols-2">
          {GUIDES.map((g) => {
            const nav = NAV.find((n) => n.view === g.view)!
            const Icon = nav.icon
            return (
              <Card key={g.view} className="gap-0">
                <CardHeader className="flex-nowrap items-start">
                  <div className="grid min-w-0 flex-1 gap-1">
                    <CardTitle>
                      <Icon /> {nav.label}
                    </CardTitle>
                    <CardDescription>{g.purpose}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    aria-label={`Open ${nav.label}`}
                    onClick={() => goTo(g.view)}
                  >
                    Open <ArrowRightIcon />
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-2">
                  <ol className="grid list-decimal gap-1.5 pl-4 text-sm marker:text-faint-foreground">
                    {g.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {g.tip && <p className="text-caption text-muted-foreground">Tip: {g.tip}</p>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </Section>

      <Section
        id="legend"
        title="Colours and marks"
        description="The same colour means the same thing on every page."
      >
        <div className="grid gap-4 @min-[900px]:grid-cols-2 @min-[1400px]:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Drivers and teams</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                <LegendRow mark={<Swatch className="bg-driver-a" />}>
                  Driver A in a duel or head-to-head
                </LegendRow>
                <LegendRow mark={<Swatch className="bg-driver-b" />}>Driver B</LegendRow>
                <LegendRow
                  mark={<span className="h-3.5 w-[3px] rounded-full bg-signal" aria-hidden />}
                >
                  A bar before a name is that team&apos;s colour
                </LegendRow>
                <LegendRow mark={<Swatch className="bg-signal" />}>
                  Highlight: the leader, the record, the selected item
                </LegendRow>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Timing</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                <LegendRow mark={<Swatch className="bg-sector-best" />}>
                  Fastest of anyone (session best)
                </LegendRow>
                <LegendRow mark={<Swatch className="bg-success" />}>
                  Driver&apos;s own best; places gained
                </LegendRow>
                <LegendRow mark={<Swatch className="bg-tyre-medium" />}>
                  Slower than their best
                </LegendRow>
                <LegendRow mark={<Swatch className="bg-danger" />}>Places lost; red flag</LegendRow>
                <LegendRow mark={<Swatch className="bg-tyre-medium/40" />}>
                  Timeline band: safety car or VSC
                </LegendRow>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tyres</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                {[
                  ['SOFT', 'Soft: fastest, wears quickest'],
                  ['MEDIUM', 'Medium'],
                  ['HARD', 'Hard: slowest, lasts longest'],
                  ['INTERMEDIATE', 'Intermediate: a damp track'],
                  ['WET', 'Full wet: heavy rain'],
                ].map(([c, label]) => (
                  <LegendRow key={c} mark={<CompoundTyre compound={c!} />}>
                    {label}
                  </LegendRow>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Badges and marks</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                <LegendRow
                  mark={
                    <Badge className="border-transparent bg-sector-best/15 text-sector-best">
                      FL
                    </Badge>
                  }
                >
                  Fastest lap of the race
                </LegendRow>
                <LegendRow mark={<Badge variant="outline">DOTD</Badge>}>
                  Driver of the Day
                </LegendRow>
                <LegendRow
                  mark={
                    <Badge className="border-transparent bg-signal-soft text-signal-ink">
                      Slam
                    </Badge>
                  }
                >
                  Grand slam (pole, win, fastest lap, led every lap)
                </LegendRow>
                <LegendRow
                  mark={
                    <Badge className="border-transparent bg-signal-soft text-signal-ink">
                      Title
                    </Badge>
                  }
                >
                  The championship was decided at this race
                </LegendRow>
                <LegendRow mark={<span className="text-signal-ink">★</span>}>
                  On a season bar: a title-winning season
                </LegendRow>
                <LegendRow mark={<span className="text-success">↑3</span>}>
                  Places gained from the grid (↓ lost)
                </LegendRow>
                <LegendRow
                  mark={<span className="text-caption text-faint-foreground">ALL TIME</span>}
                >
                  A career total; the era filter doesn&apos;t apply
                </LegendRow>
              </ul>
            </CardContent>
          </Card>
          <Card className="@min-[1400px]:col-span-2">
            <CardHeader>
              <CardTitle>Result codes</CardTitle>
              <CardDescription>as printed in results and grids</CardDescription>
            </CardHeader>
            <CardContent>
              <Terms terms={RESULT_CODES} />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section id="glossary" title="Glossary">
        <Card>
          <CardContent className="pt-4 sm:pt-5">
            <Terms terms={GLOSSARY} />
          </CardContent>
        </Card>
      </Section>

      <Section
        id="shortcuts"
        title="Keyboard shortcuts"
        description="Press ? anywhere to see these."
      >
        <div className="grid gap-4 @min-[900px]:grid-cols-2">
          {SHORTCUT_GROUPS.map((group) => (
            <Card key={group.title}>
              <CardHeader>
                <CardTitle>{group.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid">
                  {group.items.map(([keys, label]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-4 border-b border-border/60 py-1.5 last:border-0"
                    >
                      <dt className="text-sm text-muted-foreground">{label}</dt>
                      <dd>
                        <KbdGroup>
                          {keys.map((k) => (
                            <Kbd key={k}>{k}</Kbd>
                          ))}
                        </KbdGroup>
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="data" title="About the data">
        <Card>
          <CardContent className="grid gap-4 pt-4 text-sm sm:pt-5 @min-[900px]:grid-cols-2">
            {[
              [
                'Telemetry, 2023 onwards',
                'Speed, throttle, brake, gear, RPM, DRS and position for every lap, from TracingInsights (built with FastF1). New sessions appear a few hours after they end.',
              ],
              [
                'History, 1950 onwards',
                'Every Grand Prix weekend, standings, entry lists, engines, tyres and circuits, from F1DB. Updated after each race weekend.',
              ],
              [
                'What isn’t public',
                'Tyre temperatures, fuel, aero, suspension and power-unit data stay with the teams, so no fan site has them.',
              ],
              [
                'No photos, on purpose',
                'Official driver portraits and team logos belong to Formula 1 and the teams. Unbox Box uses flags, helmets and team colours instead.',
              ],
              [
                'Pit stop times',
                'Race Archive times are the whole trip down the pit lane, not the stop alone, so they depend on the pit lane’s length.',
              ],
              [
                'No account needed',
                'Unbox Box runs in your browser from static files. It works offline once a page has loaded.',
              ],
            ].map(([title, body]) => (
              <div key={title} className="grid gap-0.5">
                <span className="font-medium">{title}</span>
                <span className="text-muted-foreground">{body}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>

      <Section
        id="feedback"
        title="Report a bug or suggest a feature"
        description="Something wrong, missing or confusing? Tell us here."
      >
        <Card>
          <CardContent className="pt-4 sm:pt-5">
            <FeedbackForm />
          </CardContent>
        </Card>
      </Section>
    </>
  )
}
