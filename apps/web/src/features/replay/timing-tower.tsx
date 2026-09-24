'use client'

import { findDriver, formatInterval, standingsAt, trackStatusAt } from '@unbox-box/tools'
import { m } from 'motion/react'
import { PictureInPicture2Icon } from 'lucide-react'
import type * as React from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HelpText } from '@/components/help-text'
import type { RaceData } from '@/lib/types'
import { DriverStripe } from '@/components/driver-marks'
import { Hint } from '@/components/ui/hint'
import { CompoundTyre } from '@/components/icons/compound-tyre'
import { StopwatchIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApp, usePlayback } from '@/lib/store'
import { quickSlide, spring } from '@/lib/motion'
import { usePipSupported, usePipWindow } from '@/lib/use-pip-window'
import { useDriverColor } from '@/lib/use-team-colors'
import { cn } from '@/lib/utils'
import { useThrottledTime } from './use-replay'

const FLASH_MS = 1600
/** More simultaneous changes than this is a seek, not overtaking: no flashes. */
const MAX_REAL_CHANGES = 4

interface Change {
  dir: 1 | -1
  at: number
}

/** Remembers who just gained or lost a place, so the row can flash ▲ or ▼. */
function usePositionChanges(rows: { driver: string; position: number }[]) {
  const previous = useRef(new Map<string, number>())
  const changes = useRef(new Map<string, Change>())
  useEffect(() => {
    const moved = rows.filter((r) => {
      const before = previous.current.get(r.driver)
      return before != null && before !== r.position
    })
    const at = performance.now()
    if (moved.length <= MAX_REAL_CHANGES) {
      for (const r of moved) {
        const dir = r.position < previous.current.get(r.driver)! ? 1 : -1
        changes.current.set(r.driver, { dir, at })
      }
    } else {
      changes.current.clear()
    }
    previous.current = new Map(rows.map((r) => [r.driver, r.position]))
  }, [rows])
  return (driver: string): Change | null => {
    const c = changes.current.get(driver)
    return c && performance.now() - c.at < FLASH_MS ? c : null
  }
}

const STATE_LABEL = { pit: 'PIT', finished: 'FIN', out: 'OUT', dns: 'DNS', running: '' } as const

function TowerCard({ meta, replay, action }: RaceData & { action?: React.ReactNode }) {
  const time = useThrottledTime(250)
  // At 16x and above, rows reorder faster than a spring settles.
  const fast = usePlayback((s) => s.speed) >= 16
  const duel = useApp((s) => s.duel)
  const focus = usePlayback((s) => s.focus)
  const setFocus = usePlayback((s) => s.setFocus)
  const rows = useMemo(() => standingsAt(replay, time), [replay, time])
  // Under a red flag every car sits in the pit lane: gaps and PIT tags mean nothing.
  const suspended = trackStatusAt(replay, time) === 'red'
  const name = (code: string) => findDriver(meta, code)?.lastName ?? code
  const changeOf = usePositionChanges(rows)
  const colorOf = useDriverColor()

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="grid gap-0.5">
          <CardTitle>
            <StopwatchIcon />
            Timing
          </CardTitle>
          {suspended ? (
            <CardDescription className="flex items-center gap-1.5 font-medium text-danger">
              <span className="size-1.5 animate-pulse rounded-full bg-danger" aria-hidden />
              Red flag · race suspended
            </CardDescription>
          ) : (
            <CardDescription>gap to leader · interval</CardDescription>
          )}
        </div>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <ol className="text-sm" aria-label="Running order">
        {rows.map((row) => {
          const isA = duel?.a === row.driver
          const isB = duel?.b === row.driver
          const dim = row.state === 'out' || row.state === 'dns'
          const change = changeOf(row.driver)
          return (
            <m.li
              key={row.driver}
              layout="position"
              transition={fast ? quickSlide : spring.snappy}
              className={cn(
                'grid cursor-pointer grid-cols-[1.75rem_1fr_auto_auto] items-center gap-x-2 border-t px-3 py-1.5 hover:bg-surface-2',
                focus === row.driver && 'bg-signal-soft hover:bg-signal-soft',
                dim && 'opacity-45',
              )}
              onClick={() => setFocus(focus === row.driver ? null : row.driver)}
              aria-current={focus === row.driver}
            >
              <span className="relative numeric text-xs text-faint-foreground">
                {row.position}
                {change && (
                  <m.span
                    key={change.at}
                    aria-hidden
                    className={cn(
                      'absolute top-1/2 -right-0.5 -translate-y-1/2 text-[9px]',
                      change.dir > 0 ? 'text-success' : 'text-danger',
                    )}
                    initial={{ opacity: 0, y: change.dir > 0 ? 3 : -3 }}
                    animate={{ opacity: [0, 1, 1, 0], y: 0 }}
                    transition={{ duration: FLASH_MS / 1000, times: [0, 0.1, 0.7, 1] }}
                  >
                    {change.dir > 0 ? '▲' : '▼'}
                  </m.span>
                )}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <DriverStripe
                  color={colorOf(row.driver)}
                  className={cn('h-4 transition-[width]', (isA || isB) && 'w-[5px]')}
                />
                <span className="font-mono font-semibold tracking-tight">{row.driver}</span>
                <span className="hidden truncate text-xs text-muted-foreground @min-[1200px]:inline">
                  {name(row.driver)}
                </span>
                {STATE_LABEL[row.state] && !(suspended && row.state === 'pit') && (
                  <span
                    className={cn(
                      'rounded px-1 font-mono text-[10px]',
                      row.state === 'pit'
                        ? 'bg-signal text-signal-foreground'
                        : 'bg-surface-3 text-muted-foreground',
                    )}
                  >
                    {STATE_LABEL[row.state]}
                  </span>
                )}
              </span>
              <span className="text-right numeric text-xs">
                {row.position === 1 || suspended ? (
                  <span className="text-muted-foreground">
                    {row.position === 1 ? `Lap ${row.lap}` : '—'}
                  </span>
                ) : (
                  <>
                    <span>{formatInterval(row.gap)}</span>
                    <span className="ml-2 hidden text-faint-foreground @min-[1300px]:inline">
                      {formatInterval(row.interval)}
                    </span>
                  </>
                )}
              </span>
              <span className="flex items-center justify-end gap-1 numeric text-[11px] text-muted-foreground">
                {row.compound && (
                  <Hint label={`${row.compound.toLowerCase()}, ${row.tyreAge} laps old`}>
                    <span className="flex">
                      <CompoundTyre compound={row.compound} className="size-3.5" />
                    </span>
                  </Hint>
                )}
                <span className="w-5 text-right">{row.tyreAge}</span>
              </span>
            </m.li>
          )
        })}
      </ol>
      <HelpText className="border-t px-3 py-2">
        On-track order. Post-race penalties are not applied. Tap a driver to follow them.
      </HelpText>
    </Card>
  )
}

/** The timing tower, with a pop-out into a floating always-on-top window (Document
 *  Picture-in-Picture, Chromium) to keep beside the TV broadcast. */
export function TimingTower({ meta, replay }: RaceData) {
  const supported = usePipSupported()
  const { pip, open, close } = usePipWindow()

  if (pip) {
    return (
      <>
        {createPortal(<TowerCard meta={meta} replay={replay} />, pip.document.body)}
        <Card className="items-center justify-center gap-3 p-6 text-center">
          <PictureInPicture2Icon className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">The timing tower is in a floating window.</p>
          <Button variant="outline" size="sm" onClick={close}>
            Bring it back
          </Button>
        </Card>
      </>
    )
  }
  return (
    <TowerCard
      meta={meta}
      replay={replay}
      action={
        supported && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => void open()}
                aria-label="Pop out the timing tower"
              >
                <PictureInPicture2Icon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pop out · keep it beside the TV</TooltipContent>
          </Tooltip>
        )
      }
    />
  )
}
