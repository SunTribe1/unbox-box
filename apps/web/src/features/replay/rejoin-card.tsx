'use client'

import { pitRejoin, standingsAt } from '@unbox-box/tools'
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react'
import { useMemo } from 'react'
import type { RaceData } from '@/lib/types'
import { DriverStripe } from '@/components/driver-marks'
import { PitBoardIcon } from '@/components/icons'
import { AnimatedNumber } from '@/components/ui/animated-number'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useApp, usePlayback } from '@/lib/store'
import { useDriverColor } from '@/lib/use-team-colors'
import { useStrategyModel } from '../strategy/shared'
import { useThrottledTime } from './use-replay'

const formatP = (v: number) => `P${Math.round(v)}`

function Neighbour({
  label,
  driver,
  margin,
  up,
}: {
  label: string
  driver: string
  margin: number
  up: boolean
}) {
  const colorOf = useDriverColor()
  const Icon = up ? ArrowUpIcon : ArrowDownIcon
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2">
      <span className="flex items-center gap-2 text-caption text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </span>
      <span className="flex items-center gap-2">
        <DriverStripe color={colorOf(driver)} />
        <span className="numeric text-sm font-semibold">{driver}</span>
        <span className="numeric text-sm text-muted-foreground">{margin.toFixed(1)}s</span>
      </span>
    </div>
  )
}

/** "If they pitted now": where the followed car (or duel driver A) would rejoin, using this
 *  race's measured pit loss. Updates live with the replay. */
export function RejoinCard({ meta, replay }: RaceData) {
  const time = useThrottledTime(500)
  const model = useStrategyModel(meta, replay)
  const focus = usePlayback((s) => s.focus)
  const setFocus = usePlayback((s) => s.setFocus)
  const duelA = useApp((s) => s.duel?.a)
  const standings = useMemo(() => standingsAt(replay, time), [replay, time])
  const running = standings.filter((s) => s.state === 'running' || s.state === 'pit')
  const driver = focus ?? duelA ?? running[0]?.driver ?? ''
  const result = pitRejoin(standings, driver, model.pitLoss)

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-0.5">
          <CardTitle>
            <PitBoardIcon />
            If they pitted now
          </CardTitle>
          <CardDescription>pit loss here ≈ {model.pitLoss.toFixed(1)}s</CardDescription>
        </div>
        <CardAction>
          <Select value={driver} onValueChange={setFocus}>
            <SelectTrigger size="sm" className="w-24 font-mono" aria-label="Driver">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {running.map((s) => (
                <SelectItem key={s.driver} value={s.driver} className="font-mono">
                  {s.driver}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        {result ? (
          <>
            <div className="flex items-baseline gap-3">
              <span className="numeric text-display">
                <AnimatedNumber value={result.position} format={formatP} />
              </span>
              <span className="text-caption text-muted-foreground">
                from <span className="numeric">P{result.current}</span>
                {result.position > result.current &&
                  ` · loses ${result.position - result.current} place${result.position - result.current > 1 ? 's' : ''}`}
              </span>
            </div>
            <div className="grid gap-1.5">
              {result.ahead && (
                <Neighbour
                  label="behind"
                  driver={result.ahead.driver}
                  margin={result.ahead.margin}
                  up
                />
              )}
              {result.behind && (
                <Neighbour
                  label="ahead of"
                  driver={result.behind.driver}
                  margin={result.behind.margin}
                  up={false}
                />
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Pick a car that&apos;s still running.</p>
        )}
      </CardContent>
    </Card>
  )
}
