'use client'

import { circuitWinners, type CircuitShapes, type HistoryData } from '@unbox-box/tools'
import { MapPinIcon, SearchIcon } from 'lucide-react'
import { m } from 'motion/react'
import { useMemo, useState } from 'react'
import { Flag } from '@/components/flag'
import { CircuitIcon } from '@/components/icons'
import { PageHeader } from '@/components/page-header'
import { TileButton } from '@/components/tile-button'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatEventDate } from '@/lib/format'
import { riseIn, stagger } from '@/lib/motion'
import { useApp } from '@/lib/store'
import { stripAccents } from '@unbox-box/tools'
import { CircuitOutline } from './circuit-outline'

type Scope = 'season' | 'all'

interface Row {
  index: number
  id: string
  name: string
  place: string
  country: string | null
  code: string | null
  races: number
  lastWinner: string | null
  lastYear: number | null
  next: string | null
  current: boolean
}

/** Every circuit that has hosted a Grand Prix: this season's calendar first. */
export function CircuitIndex({ data, shapes }: { data: HistoryData; shapes?: CircuitShapes }) {
  const setCircuit = useApp((s) => s.setCircuit)
  const [scope, setScope] = useState<Scope>('season')
  const [query, setQuery] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const rows = useMemo<Row[]>(() => {
    const { races, circuits, latestSeason, calendar } = data.index
    const hosted = new Map<number, number>()
    races.circuit.forEach((c) => hosted.set(c, (hosted.get(c) ?? 0) + 1))
    const thisSeason = new Set(races.circuit.filter((_, race) => races.year[race] === latestSeason))
    for (const c of calendar) if (c.year === latestSeason) thisSeason.add(c.circuit)
    return circuits
      .map((c, index) => {
        const winner = circuitWinners(data, index)[0]
        const next = calendar
          .filter((x) => x.circuit === index && x.date >= today)
          .sort((a, b) => a.date.localeCompare(b.date))[0]
        return {
          index,
          id: c.id,
          name: c.name,
          place: c.place,
          country: c.country,
          code: c.code ?? null,
          races: hosted.get(index) ?? 0,
          lastWinner: winner ? (data.index.drivers[winner.driver]?.name ?? null) : null,
          lastYear: winner?.year ?? null,
          next: next?.date ?? null,
          current: thisSeason.has(index),
        }
      })
      .filter((r) => r.races > 0 || r.next)
      .sort((a, b) => Number(b.current) - Number(a.current) || b.races - a.races)
  }, [data, today])

  const plain = (s: string) => stripAccents(s).toLowerCase()
  const q = plain(query.trim())
  const shown = rows.filter(
    (r) =>
      (scope === 'all' || r.current) &&
      (!q || plain(`${r.name} ${r.place} ${r.country ?? ''}`).includes(q)),
  )

  return (
    <div className="grid gap-4">
      <PageHeader
        icon={CircuitIcon}
        title="Circuits"
        description={
          <>{rows.length} circuits have hosted a Grand Prix since 1950. Pick one for its story.</>
        }
        actions={
          <>
            <InputGroup className="w-56">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search circuits"
                aria-label="Search circuits"
              />
            </InputGroup>
            <ToggleGroup
              type="single"
              value={scope}
              onValueChange={(v) => v && setScope(v as Scope)}
              aria-label="Circuits shown"
            >
              <ToggleGroupItem value="season">{data.index.latestSeason} calendar</ToggleGroupItem>
              <ToggleGroupItem value="all">All-time</ToggleGroupItem>
            </ToggleGroup>
          </>
        }
      />

      {shown.length ? (
        <m.ul
          key={scope}
          className="grid gap-3 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-3 @min-[1300px]:grid-cols-4"
          variants={stagger(0.03)}
          initial="hidden"
          animate="show"
        >
          {shown.map((r) => {
            const shape = shapes?.[r.id]
            return (
              <m.li key={r.id} variants={riseIn}>
                <TileButton onClick={() => setCircuit(r.id)} className="gap-3">
                  <div className="flex h-28 items-center justify-center">
                    {shape ? (
                      <CircuitOutline
                        shape={shape}
                        layoutId={`circuit-${r.id}`}
                        className="h-full w-full transition-colors group-hover:text-signal"
                        label={`${r.name} layout`}
                      />
                    ) : (
                      <MapPinIcon className="size-8 text-faint-foreground" aria-hidden />
                    )}
                  </div>
                  <div className="grid gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                        <Flag code={r.code} />
                        <span className="truncate">{r.name}</span>
                      </span>
                      {r.next && (
                        <Badge className="shrink-0 border-transparent bg-signal-soft text-signal-ink">
                          {formatEventDate(r.next, { year: false })}
                        </Badge>
                      )}
                    </div>
                    <span className="truncate text-caption text-muted-foreground">
                      {r.place}
                      {r.country ? ` · ${r.country}` : ''}
                    </span>
                    <span className="flex justify-between gap-2 text-caption text-muted-foreground">
                      <span className="numeric">{r.races} Grands Prix</span>
                      {r.lastWinner && (
                        <span className="truncate">
                          {r.lastYear}: {r.lastWinner}
                        </span>
                      )}
                    </span>
                  </div>
                </TileButton>
              </m.li>
            )
          })}
        </m.ul>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No circuits match “{query}”</EmptyTitle>
            <EmptyDescription>Try a city or a country, or switch to All-time.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
