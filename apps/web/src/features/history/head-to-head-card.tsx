'use client'

import { careerBySeason, headToHead, type HistoryData, type HistoryDriver } from '@unbox-box/tools'
import { useMemo } from 'react'
import { Hint } from '@/components/ui/hint'
import { HelmetIcon } from '@/components/icons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useApp } from '@/lib/store'
import { GrowBar } from '@/components/ui/grow-bar'
import { cn } from '@/lib/utils'
import { DriverPicker } from './driver-picker'

const ROWS: { key: keyof HistoryDriver; label: string }[] = [
  { key: 'titles', label: 'Championships' },
  { key: 'wins', label: 'Wins' },
  { key: 'poles', label: 'Poles' },
  { key: 'podiums', label: 'Podiums' },
  { key: 'fastestLaps', label: 'Fastest laps' },
  { key: 'starts', label: 'Starts' },
]

function MirroredRow({ label, a, b }: { label: string; a: number; b: number }) {
  const max = Math.max(a, b, 1)
  return (
    <div className="grid grid-cols-[1fr_7rem_1fr] items-center gap-3 py-1.5">
      <div className="flex items-center justify-end gap-2">
        <span className={cn('numeric text-sm', a > b && 'font-semibold')}>{a}</span>
        <div className="h-2.5 w-full max-w-48">
          <GrowBar value={a / max} from="end" className="rounded-l-[4px] bg-driver-a" />
        </div>
      </div>
      <span className="text-center text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-full max-w-48">
          <GrowBar value={b / max} className="rounded-r-[4px] bg-driver-b" />
        </div>
        <span className={cn('numeric text-sm', b > a && 'font-semibold')}>{b}</span>
      </div>
    </div>
  )
}

function SplitBar({
  label,
  a,
  b,
  nameA,
  nameB,
}: {
  label: string
  a: number
  b: number
  nameA: string
  nameB: string
}) {
  const total = a + b
  if (!total) return null
  return (
    <div className="grid gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="numeric">
          {nameA} {a}
        </span>
        <span className="text-muted-foreground">{label}</span>
        <span className="numeric">
          {b} {nameB}
        </span>
      </div>
      <div
        className="relative h-2.5 overflow-hidden rounded-full bg-driver-b"
        role="img"
        aria-label={`${label}: ${nameA} ${a}, ${nameB} ${b}`}
      >
        {/* Driver A's share grows over B's colour; the gap line marks the split. */}
        <span className="absolute inset-0">
          <GrowBar value={a / total} className="bg-driver-a shadow-[2px_0_0_var(--surface-1)]" />
        </span>
      </div>
    </div>
  )
}

function WinsBySeason({ data, a, b }: { data: HistoryData; a: number; b: number }) {
  const sa = useMemo(() => careerBySeason(data, a), [data, a])
  const sb = useMemo(() => careerBySeason(data, b), [data, b])
  const years = [...new Set([...sa, ...sb].map((s) => s.year))].sort((x, y) => x - y)
  if (!years.length) return null
  const first = years[0]!
  const last = years.at(-1)!
  const span = Array.from({ length: last - first + 1 }, (_, i) => first + i)
  const get = (list: typeof sa, y: number) => list.find((s) => s.year === y)
  const max = Math.max(1, ...sa.map((s) => s.wins), ...sb.map((s) => s.wins))
  const nameA = data.index.drivers[a]!.lastName
  const nameB = data.index.drivers[b]!.lastName
  const label = (y: number, x?: (typeof sa)[number], z?: (typeof sb)[number]) =>
    `${y}: ${nameA} ${x ? `${x.wins} wins` : 'did not race'}, ${nameB} ${z ? `${z.wins} wins` : 'did not race'}${x?.champion ? ` · ${nameA} champion` : z?.champion ? ` · ${nameB} champion` : ''}`
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Wins per season · ★ world champion (in the driver’s colour)</span>
        <span className="font-mono">max {max}</span>
      </div>
      <div className="overflow-x-auto">
        <div
          className="flex h-28 min-w-full items-end gap-[3px]"
          style={{ width: span.length > 30 ? `${span.length * 18}px` : undefined }}
        >
          {span.map((y) => {
            const x = get(sa, y)
            const z = get(sb, y)
            return (
              <Hint key={y} label={label(y, x, z)}>
                <div className="flex h-full min-w-3 flex-1 flex-col justify-end">
                  <div className="flex h-full items-end justify-center gap-px">
                    {([x, z] as const).map((season, k) => (
                      <div
                        key={k}
                        className={cn(
                          'w-1/2 max-w-2 rounded-t-[3px]',
                          k === 0 ? 'bg-driver-a' : 'bg-driver-b',
                          !season && 'invisible',
                        )}
                        // Raced but won nothing: a 2px baseline, so each column reads as A | B.
                        style={{
                          height: season ? `max(2px, ${(season.wins / max) * 100}%)` : 0,
                        }}
                      />
                    ))}
                  </div>
                  {/* Stars sit in the same two slots as the bars, under the champion's bar. */}
                  <div className="flex h-3 justify-center gap-px" aria-hidden>
                    {([x, z] as const).map((season, k) => (
                      <span
                        key={k}
                        className={cn(
                          'w-1/2 max-w-2 text-center text-[9px] leading-3',
                          k === 0 ? 'text-driver-a-ink' : 'text-driver-b-ink',
                        )}
                      >
                        {season?.champion ? '★' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </Hint>
            )
          })}
        </div>
        <div className="flex justify-between font-mono text-[10px] text-faint-foreground">
          <span>{first}</span>
          <span>{last}</span>
        </div>
      </div>
    </div>
  )
}

export function HeadToHeadCard({ data, a, b }: { data: HistoryData; a: number; b: number }) {
  const setHistory = useApp((s) => s.setHistory)
  const h = useMemo(() => headToHead(data, a, b), [data, a, b])
  const years = (d: HistoryDriver) =>
    d.firstYear === d.lastYear
      ? `${d.firstYear}`
      : `${d.firstYear}–${d.active ? 'present' : d.lastYear}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <HelmetIcon />
          Head to head
        </CardTitle>
        <CardDescription>1950 to today</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['a', a, h.a],
              ['b', b, h.b],
            ] as const
          ).map(([side, idx, d]) => (
            <div key={side} className="grid gap-2">
              <DriverPicker
                data={data}
                value={idx}
                side={side}
                onChange={(i) => setHistory({ [side]: data.index.drivers[i]!.id })}
              />
              <p className={cn('text-xs text-muted-foreground', side === 'b' && 'text-right')}>
                {d.nationality} · {years(d)}
                {d.titles > 0 && (
                  <span className="text-signal-ink"> · {'★'.repeat(Math.min(d.titles, 8))}</span>
                )}
              </p>
            </div>
          ))}
        </div>
        <div>
          {ROWS.map((r) => (
            <MirroredRow
              key={r.key}
              label={r.label}
              a={Number(h.a[r.key])}
              b={Number(h.b[r.key])}
            />
          ))}
        </div>
        <div className="grid gap-3 rounded-lg bg-surface-2 p-4">
          {h.together ? (
            <>
              <p className="text-sm">
                <strong>{h.together}</strong> races together
                <span className="text-muted-foreground">
                  {' '}
                  (
                  {h.firstShared === h.lastShared
                    ? h.firstShared
                    : `${h.firstShared}–${h.lastShared}`}
                  )
                </span>
              </p>
              <SplitBar
                label="finished ahead"
                a={h.finishedAhead.a}
                b={h.finishedAhead.b}
                nameA={h.a.lastName}
                nameB={h.b.lastName}
              />
              <SplitBar
                label="started ahead"
                a={h.startedAhead.a}
                b={h.startedAhead.b}
                nameA={h.a.lastName}
                nameB={h.b.lastName}
              />
              {h.teammateRaces > 0 && (
                <SplitBar
                  label={`as teammates (${h.teammateRaces})`}
                  a={h.teammateAhead.a}
                  b={h.teammateAhead.b}
                  nameA={h.a.lastName}
                  nameB={h.b.lastName}
                />
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {h.a.lastName} and {h.b.lastName} never started the same race.
            </p>
          )}
        </div>
        <WinsBySeason data={data} a={a} b={b} />
      </CardContent>
    </Card>
  )
}
