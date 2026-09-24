'use client'

import { compareSections } from '@unbox-box/tools'
import { useMemo } from 'react'
import { HelpText } from '@/components/help-text'
import { SteeringWheelIcon } from '@/components/icons'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useApp } from '@/lib/store'
import { GrowBar } from '@/components/ui/grow-bar'
import { cn } from '@/lib/utils'
import type { DuelData } from './use-duel'

/** Where the lap was won and lost, corner by corner. Bars grow toward the driver who gained. */
export function SectionTable({ data }: { data: DuelData }) {
  const { meta, telA, telB, lapA, lapB } = data
  const corner = useApp((s) => s.corner)
  const setCorner = useApp((s) => s.setCorner)
  const rows = useMemo(
    () => compareSections(meta, telA, telB, { a: lapA.time, b: lapB.time }),
    [meta, telA, telB, lapA.time, lapB.time],
  )
  const max = Math.max(0.02, ...rows.map((r) => Math.abs(r.delta)))

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle>
          <SteeringWheelIcon />
          Corner by corner
        </CardTitle>
        <CardDescription>who gained, and by how much</CardDescription>
      </CardHeader>
      <Table className="text-sm">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 pl-4 text-label text-faint-foreground sm:pl-5">
              Section
            </TableHead>
            <TableHead className="h-8 text-center text-label text-faint-foreground">Gain</TableHead>
            <TableHead className="h-8 pr-4 text-right text-label text-faint-foreground sm:pr-5">
              Min km/h
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const active = corner != null && row.section.corners.includes(corner)
            const aGained = row.delta > 0
            const share = Math.abs(row.delta) / max
            const toggle = () => setCorner(active ? null : (row.section.corners[0] ?? null))
            return (
              <TableRow
                key={row.section.id}
                data-state={active ? 'selected' : undefined}
                onClick={toggle}
                className="cursor-pointer data-[state=selected]:bg-signal-soft"
              >
                <TableCell className="py-2 pl-4 sm:pl-5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle()
                    }}
                    aria-pressed={active}
                    className="text-left outline-none focus-visible:underline"
                  >
                    <span className="block font-medium">{row.section.name}</span>
                    {row.section.name !== row.section.turns.replace(/^T/, 'Turn ') && (
                      <span className="block numeric text-[11px] text-faint-foreground">
                        {row.section.turns}
                      </span>
                    )}
                  </button>
                </TableCell>
                <TableCell className="w-[40%] px-2">
                  <div className="relative h-5" aria-hidden>
                    <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                    <span
                      className={cn(
                        'absolute top-1/2 h-2.5 w-1/2 -translate-y-1/2',
                        aGained ? 'right-1/2' : 'left-1/2',
                      )}
                    >
                      <GrowBar
                        value={share}
                        from={aGained ? 'end' : 'start'}
                        className={
                          aGained ? 'rounded-l-sm bg-driver-a' : 'rounded-r-sm bg-driver-b'
                        }
                      />
                    </span>
                  </div>
                  <div className="mt-0.5 text-center numeric text-[11px] text-muted-foreground">
                    {Math.abs(row.delta) < 0.0005
                      ? 'even'
                      : `${aGained ? telA.driver : telB.driver} +${Math.abs(row.delta).toFixed(3)}s`}
                  </div>
                </TableCell>
                <TableCell className="py-2 pr-4 text-right numeric text-xs sm:pr-5">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="size-1.5 rounded-full bg-driver-a" aria-hidden />
                    {Math.round(row.minSpeed.a)}
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="size-1.5 rounded-full bg-driver-b" aria-hidden />
                    {Math.round(row.minSpeed.b)}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <CardFooter className="mt-auto">
        <HelpText>Section times add up exactly to the lap-time gap.</HelpText>
      </CardFooter>
    </Card>
  )
}
