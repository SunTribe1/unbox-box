'use client'

import { CircleHelpIcon, CodeIcon, UserIcon } from 'lucide-react'
import { m } from 'motion/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { enter } from '@/lib/motion'
import { DEVELOPER_SECTIONS, DeveloperGuide } from './developer-guide'
import { USER_SECTIONS, UserGuide } from './user-guide'

type Audience = 'users' | 'developers'

/** Developer anchors start with "dev", so /help/#dev-webmcp opens the developer guide. */
const audienceOf = (hash: string): Audience => (hash.startsWith('#dev') ? 'developers' : 'users')

/** Help & feedback: a guide for people using Unbox Box, and one for people building on it. */
export function HelpView() {
  // Help renders on the client after the app boots, so the hash is readable here.
  const [audience, setAudience] = useState<Audience>(() =>
    typeof window === 'undefined' ? 'users' : audienceOf(window.location.hash),
  )

  // Links like /help/#feedback: the page renders after load, so scroll once it's there.
  useEffect(() => {
    const { hash } = window.location
    if (hash) requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView())
  }, [])

  const pick = (next: Audience) => {
    setAudience(next)
    const hash = next === 'developers' ? '#dev-architecture' : ''
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}${hash}`,
    )
  }
  const sections = audience === 'developers' ? DEVELOPER_SECTIONS : USER_SECTIONS

  return (
    <m.div
      className="grid gap-6 @min-[1100px]:grid-cols-[12rem_minmax(0,1fr)] @min-[1100px]:gap-8"
      {...enter}
    >
      <nav aria-label="On this page" className="hidden @min-[1100px]:block">
        <ol className="sticky top-2 grid gap-0.5 text-sm">
          {sections.map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid min-w-0 gap-10">
        <header className="grid gap-3">
          <div className="grid gap-1">
            <h2 className="flex items-center gap-2 text-display">
              <CircleHelpIcon className="size-6 text-muted-foreground" aria-hidden /> Help &amp;
              feedback
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {audience === 'users'
                ? 'How each page works, what its colours mean, and where to tell us about a bug or an idea.'
                : 'How Unbox Box is built, where its data comes from, how browser agents use it, and how to contribute.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup
              type="single"
              value={audience}
              onValueChange={(v) => v && pick(v as Audience)}
              aria-label="Guide"
            >
              <ToggleGroupItem value="users">
                <UserIcon /> Using Unbox Box
              </ToggleGroupItem>
              <ToggleGroupItem value="developers">
                <CodeIcon /> For developers
              </ToggleGroupItem>
            </ToggleGroup>
            {audience === 'users' && (
              <Button size="sm" asChild>
                <a href="#feedback">Report a bug or idea</a>
              </Button>
            )}
          </div>
        </header>
        {audience === 'users' ? <UserGuide /> : <DeveloperGuide />}
      </div>
    </m.div>
  )
}
