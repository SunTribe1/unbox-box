'use client'

import { CircleHelpIcon, CodeIcon, InfoIcon } from 'lucide-react'
import { m } from 'motion/react'
import Link from 'next/link'
import { Fragment } from 'react'
import type * as React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { spring } from '@/lib/motion'
import { useApp } from '@/lib/store'
import { REPO_URL } from '@/lib/site'
import { cn } from '@/lib/utils'
import { Logo } from './logo'
import { goTo, NAV, openLapDuel } from './nav'

function RailButton({
  label,
  active,
  disabled,
  onClick,
  children,
  hint,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
  hint?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          aria-disabled={disabled}
          onClick={disabled ? undefined : onClick}
          className={cn(
            'relative flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground [&_svg]:relative [&_svg]:size-[18px]',
            !active && 'hover:bg-surface-2',
            active && 'text-signal-ink [&_svg]:glow-icon',
            disabled && 'opacity-40 hover:bg-transparent hover:text-muted-foreground',
          )}
        >
          {active && (
            <>
              <m.span
                layoutId="rail-pill"
                className="absolute inset-0 rounded-lg bg-surface-2"
                transition={spring.snappy}
              />
              <m.span
                layoutId="rail-marker"
                className="absolute top-2 -left-3 h-6 w-1 rounded-r bg-signal glow-dot"
                transition={spring.snappy}
              />
            </>
          )}
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {label}
        {hint && <span className="text-muted-foreground"> · {hint}</span>}
      </TooltipContent>
    </Tooltip>
  )
}

export function Sidebar() {
  const view = useApp((s) => s.view)
  return (
    <nav
      aria-label="Main"
      className="no-scrollbar hidden w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r bg-surface-1 py-3 md:flex"
    >
      <Link href="/duel/" onClick={openLapDuel} aria-label="Unbox Box: Lap Duel" className="mb-3">
        <Logo className="size-10" />
      </Link>
      {NAV.filter((n) => n.group !== 'meta').map(({ view: v, label, icon: Icon, group }, i) => (
        <Fragment key={v}>
          {group !== NAV[i - 1]?.group && i > 0 && (
            <span className="my-1.5 h-px w-6 bg-border" role="separator" aria-hidden />
          )}
          <RailButton label={label} active={view === v} hint={`${i + 1}`} onClick={() => goTo(v)}>
            <Icon />
          </RailButton>
        </Fragment>
      ))}
      <div className="mt-auto flex flex-col gap-1">
        <RailButton label="Help & feedback" active={view === 'help'} onClick={() => goTo('help')}>
          <CircleHelpIcon />
        </RailButton>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/credits/"
              aria-label="Credits and licences"
              className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              <InfoIcon className="size-[18px]" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Credits and licences</TooltipContent>
        </Tooltip>
        {REPO_URL && (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Source code"
                className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                <CodeIcon className="size-[18px]" />
              </a>
            </TooltipTrigger>
            <TooltipContent side="right">Source code</TooltipContent>
          </Tooltip>
        )}
      </div>
    </nav>
  )
}
