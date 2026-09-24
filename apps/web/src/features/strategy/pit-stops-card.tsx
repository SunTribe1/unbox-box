'use client'

import { findDriver } from '@unbox-box/tools'
import { useMemo, useState } from 'react'
import type { RaceData } from '@/lib/types'
import { DriverStripe } from '@/components/driver-marks'
import { StopwatchIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { GrowBar } from '@/components/ui/grow-bar'
import { useApp, usePlayback } from '@/lib/store'
import { useDriverColor } from '@/lib/use-team-colors'

const COLLAPSED = 8

/** Every stop ranked by time in the pit lane (entry to exit, so it includes the stationary
 *  time and the speed-limited drive through). Tap a row to jump the replay to that stop. */
export function PitStopsCard({ meta, replay }: RaceData) {
  const [expanded, setExpanded] = useState(false)
  const colorOf = useDriverColor()
  const seek = usePlayback((s) => s.seek)
  const stops = useMemo(
    () =>
      replay.pits
        .filter((p): p is typeof p & { duration: number } => p.duration != null && p.duration > 0)
        .sort((a, b) => a.duration - b.duration),
    [replay],
  )
  const watch = (t: number | null) => {
    if (t == null) return
    seek(t - 5)
    useApp.getState().setView('replay')
  }
  const team = (code: string) => findDriver(meta, code)?.team ?? ''
  if (!stops.length) return null
  const fastest = stops[0]!.duration
  const slowest = Math.min(stops.at(-1)!.duration, fastest * 2)

  const row = (stop: (typeof stops)[number], i: number) => (
    <TableRow
      key={`${stop.driver}-${stop.lap}`}
      className="cursor-pointer outline-none focus-visible:bg-muted"
      tabIndex={0}
      onClick={() => watch(stop.in)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        watch(stop.in)
      }}
      title="Watch this stop in the replay"
    >
      <TableCell className="pl-4 numeric text-xs text-faint-foreground sm:pl-5">{i + 1}</TableCell>
      <TableCell>
        <span className="flex items-center gap-2">
          <DriverStripe color={colorOf(stop.driver)} className="h-4" />
          <span className="numeric font-semibold">{stop.driver}</span>
          <span className="hidden truncate text-caption text-muted-foreground @min-[420px]:inline">
            {team(stop.driver)}
          </span>
        </span>
      </TableCell>
      <TableCell className="numeric text-xs text-muted-foreground">L{stop.lap}</TableCell>
      <TableCell className="hidden @min-[520px]:table-cell">
        <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
          <GrowBar
            value={1 - (Math.min(stop.duration, slowest) - fastest) / (slowest - fastest || 1)}
            delay={i * 0.02}
            className="rounded-full bg-signal/80"
          />
        </span>
      </TableCell>
      <TableCell className="pr-4 text-right numeric sm:pr-5">
        {stop.duration.toFixed(1)}
        <span className="text-faint-foreground">s</span>
      </TableCell>
    </TableRow>
  )

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} asChild>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>
            <StopwatchIcon />
            Pit stops
          </CardTitle>
          <CardDescription>{stops.length} stops · fastest pit-lane time first</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 w-10 pl-4 text-label text-faint-foreground sm:pl-5">
                #
              </TableHead>
              <TableHead className="h-8 text-label text-faint-foreground">Driver</TableHead>
              <TableHead className="h-8 text-label text-faint-foreground">Lap</TableHead>
              <TableHead className="hidden h-8 w-[30%] @min-[520px]:table-cell" />
              <TableHead className="h-8 pr-4 text-right text-label text-faint-foreground sm:pr-5">
                Pit lane
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{stops.slice(0, COLLAPSED).map((stop, i) => row(stop, i))}</TableBody>
          <CollapsibleContent asChild>
            <TableBody>
              {stops.slice(COLLAPSED).map((stop, i) => row(stop, i + COLLAPSED))}
            </TableBody>
          </CollapsibleContent>
        </Table>
        {stops.length > COLLAPSED && (
          <CardFooter className="justify-center py-1.5">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {expanded ? 'Show fewer' : `Show all ${stops.length}`}
              </Button>
            </CollapsibleTrigger>
          </CardFooter>
        )}
      </Card>
    </Collapsible>
  )
}
