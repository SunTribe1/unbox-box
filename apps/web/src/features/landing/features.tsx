'use client'

import { m } from 'motion/react'
import { cn } from '@/lib/utils'
import { EASE_OUT } from '@/lib/motion'
import { AppWindow, ArrowLink, PulseDot, Tag } from './decor'
import { LoopVideo } from './loop-video'
import { useEnterApp } from './use-enter-app'

interface Feature {
  eyebrow: string
  title: string
  body: string
  points: string[]
  /** A real screen recording of the app, with a screenshot of the same view as its poster. */
  video: string
  image: string
  alt: string
  href: string
  cta: string
}

const FEATURES: Feature[] = [
  {
    eyebrow: 'Lap Duel',
    title: 'Two laps. Every metre compared.',
    body: 'Speed, throttle, brake, gear and RPM traced side by side, with the running gap and a track map that shows who is quicker through each mini-sector.',
    points: [
      'Corner-by-corner time lost',
      'Aligned to official sector times',
      'Any two laps, any session since 2023',
    ],
    video: '/landing/lap-duel.webm',
    image: '/landing/lap-duel.jpg',
    alt: 'Lap Duel comparing two qualifying laps trace by trace',
    href: '/duel/',
    cta: 'Start a lap duel',
  },
  {
    eyebrow: 'Race Replay',
    title: 'The whole race, on one map.',
    body: 'Every car moving on the circuit with a live timing tower, race control messages, safety car periods and a follow-car view.',
    points: [
      'Scrub to any moment',
      'Pit stops and incidents on the timeline',
      'Every race since 2023, up to 64× speed',
    ],
    video: '/landing/race-replay.webm',
    image: '/landing/race-replay.jpg',
    alt: 'Race Replay showing every car on the track map with the timing tower',
    href: '/replay/',
    cta: 'Watch a race replay',
  },
  {
    eyebrow: 'Strategy Lab',
    title: 'Test the call before the pit wall does.',
    body: 'Stints, tyre degradation and pit stops for every driver, a pit-stop simulator that runs the race 500 times, and an undercut check.',
    points: ['Degradation per compound', 'Pit-loss and undercut maths', 'Every race since 2023'],
    video: '/landing/strategy.webm',
    image: '/landing/strategy.jpg',
    alt: 'Strategy Lab with stints, degradation and a pit-stop simulator',
    href: '/strategy/',
    cta: 'Open Strategy Lab',
  },
  {
    eyebrow: 'Archive',
    title: 'Every Grand Prix since 1950.',
    body: 'Seasons, weekends, entry lists and every session, circuits with their past layouts, record books with an era filter, engines, tyres and nations.',
    points: [
      'Driver and team profiles',
      'Head-to-head careers',
      'Results for every season since 1950',
    ],
    video: '/landing/race-archive.webm',
    image: '/landing/race-archive.jpg',
    alt: 'Race Archive weekend page with every session',
    href: '/races/',
    cta: 'Explore the archive',
  },
]

export function Features() {
  const enter = useEnterApp()
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col justify-center py-24 sm:py-32"
    >
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <h2 id="features-title" className="max-w-2xl text-headline">
          Built like a pit wall, for anyone who watches.
        </h2>
        <div className="mt-16 grid gap-24 sm:gap-32">
          {FEATURES.map((f, i) => (
            <m.article
              key={f.eyebrow}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15% 0px' }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
              className="grid items-center gap-10 lg:grid-cols-12"
            >
              <div className={cn('lg:col-span-5', i % 2 === 1 && 'lg:order-2 lg:col-start-8')}>
                <Tag>{f.eyebrow}</Tag>
                <h3 className="mt-5 text-subhead">{f.title}</h3>
                <p className="mt-4 text-lead text-muted-foreground">{f.body}</p>
                <ul className="mt-6 grid gap-2 text-sm">
                  {f.points.map((p, n) => (
                    <li key={p} className="flex items-center gap-3">
                      <PulseDot index={n} />
                      {p}
                    </li>
                  ))}
                </ul>
                <ArrowLink onClick={() => enter(f.href)} className="mt-8">
                  {f.cta}
                </ArrowLink>
              </div>
              <div className={cn('lg:col-span-7', i % 2 === 1 && 'lg:order-1 lg:col-start-1')}>
                <AppWindow title={f.eyebrow}>
                  <LoopVideo src={f.video} poster={f.image} label={f.alt} />
                </AppWindow>
              </div>
            </m.article>
          ))}
        </div>
      </div>
    </section>
  )
}
