'use client'

import {
  engineFormulaByYear,
  tyreWars,
  type Catalog,
  type HistoryData,
  type MakerKind,
} from '@unbox-box/tools'
import { m } from 'motion/react'
import { useMemo, useState } from 'react'
import { Flag } from '@/components/flag'
import { HelpText } from '@/components/help-text'
import { EngineIcon, TyreIcon } from '@/components/icons'
import { MiniStats } from '@/components/mini-stats'
import { PageHeader } from '@/components/page-header'
import { TileButton } from '@/components/tile-button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { Hint } from '@/components/ui/hint'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { enter, riseIn, stagger } from '@/lib/motion'
import { useApp } from '@/lib/store'
import { useCatalog } from '../archive/use-archive'
import { useHistoryData } from '../history/use-history'
import { MakerPage } from './maker-page'

/** Categorical colours for the tyre-wars chart (tokens in globals.css). */
const TYRE_COLORS = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`)

type MakerSort = 'wins' | 'poles' | 'titles' | 'starts'

/** Engines & Tyres: every engine and tyre maker, the engine formula through the years, the
 *  tyre wars, and a page per maker. */
export function EnginesView() {
  const history = useHistoryData()
  const catalog = useCatalog()
  const archive = useApp((s) => s.archive)
  const kind: MakerKind = archive.kind === 'tyre' ? 'tyre' : 'engine'
  const error = history.error ?? catalog.error
  if (error) return <ErrorState title="Engines & Tyres unavailable" error={error} />
  if (!history.data || !catalog.data) return <Skeleton className="h-[560px] rounded-xl" />
  const makers = kind === 'engine' ? catalog.data.engineMakers : catalog.data.tyreMakers
  const index = archive.maker ? makers.findIndex((x) => x.id === archive.maker) : -1
  return index >= 0 ? (
    <MakerPage data={history.data} catalog={catalog.data} kind={kind} maker={index} />
  ) : (
    <MakerIndex data={history.data} catalog={catalog.data} kind={kind} />
  )
}

function MakerIndex({
  data,
  catalog,
  kind,
}: {
  data: HistoryData
  catalog: Catalog
  kind: MakerKind
}) {
  const setArchive = useApp((s) => s.setArchive)
  const [scope, setScope] = useState<'current' | 'all'>('current')
  const [sort, setSort] = useState<MakerSort>('wins')
  const latest = data.index.latestSeason
  const makers = (kind === 'engine' ? catalog.engineMakers : catalog.tyreMakers)
    .map((mk, i) => ({ ...mk, index: i }))
    .filter((mk) => mk.starts > 0 && (scope === 'all' || mk.lastYear === latest))
    .sort((a, b) => b[sort] - a[sort] || b.wins - a.wins || b.starts - a.starts)
  const Icon = kind === 'engine' ? EngineIcon : TyreIcon

  return (
    <m.div className="grid gap-4" {...enter}>
      <PageHeader
        icon={Icon}
        title="Engines & Tyres"
        description="Who powered the grid and who made its tyres, every season since 1950."
        actions={
          <>
            <ToggleGroup
              type="single"
              value={kind}
              onValueChange={(v) => v && setArchive({ kind: v as MakerKind, maker: undefined })}
              aria-label="Maker type"
            >
              <ToggleGroupItem value="engine">
                <EngineIcon /> Engines
              </ToggleGroupItem>
              <ToggleGroupItem value="tyre">
                <TyreIcon /> Tyres
              </ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup
              type="single"
              value={scope}
              onValueChange={(v) => v && setScope(v as 'current' | 'all')}
              aria-label="Makers shown"
            >
              <ToggleGroupItem value="current">{latest} grid</ToggleGroupItem>
              <ToggleGroupItem value="all">All-time</ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup
              type="single"
              value={sort}
              onValueChange={(v) => v && setSort(v as MakerSort)}
              aria-label="Sort by"
            >
              <ToggleGroupItem value="wins">Wins</ToggleGroupItem>
              <ToggleGroupItem value="poles">Poles</ToggleGroupItem>
              <ToggleGroupItem value="titles">Titles</ToggleGroupItem>
              <ToggleGroupItem value="starts">Starts</ToggleGroupItem>
            </ToggleGroup>
          </>
        }
      />

      {kind === 'engine' ? <EngineFormula catalog={catalog} /> : <TyreWars catalog={catalog} />}

      <m.ul
        key={`${kind}-${scope}`}
        className="grid gap-3 @min-[560px]:grid-cols-2 @min-[900px]:grid-cols-3 @min-[1300px]:grid-cols-4"
        variants={stagger(0.02)}
        initial="hidden"
        animate="show"
      >
        {makers.map((mk) => (
          <m.li key={mk.id} variants={riseIn}>
            <TileButton onClick={() => setArchive({ kind, maker: mk.id })} className="gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                  <Flag code={mk.country} />
                  <span className="truncate">{mk.name}</span>
                </span>
                {mk.titles > 0 && (
                  <Badge className="border-transparent bg-signal-soft text-signal-ink">
                    {mk.titles} title{mk.titles > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <span className="numeric text-caption text-muted-foreground">
                {mk.firstYear === mk.lastYear ? mk.firstYear : `${mk.firstYear}–${mk.lastYear}`}
              </span>
              <MiniStats
                items={[
                  ['Wins', mk.wins],
                  ['Poles', mk.poles],
                  ['Starts', mk.starts],
                ]}
              />
            </TileButton>
          </m.li>
        ))}
      </m.ul>
      <HelpText>
        From F1DB (CC BY 4.0). A maker&apos;s starts count every car it supplied, so they run higher
        than any one team&apos;s.
      </HelpText>
    </m.div>
  )
}

/** The engine most of the grid ran, year by year: a strip of eras. */
function EngineFormula({ catalog }: { catalog: Catalog }) {
  const years = useMemo(() => engineFormulaByYear(catalog), [catalog])
  // Merge runs of the same formula into bands.
  const bands = years.reduce<{ label: string; from: number; to: number }[]>((acc, y) => {
    const last = acc.at(-1)
    return last && last.label === y.label
      ? [...acc.slice(0, -1), { ...last, to: y.year }]
      : [...acc, { label: y.label, from: y.year, to: y.year }]
  }, [])
  const span = years.length || 1
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <EngineIcon /> The engine formula
        </CardTitle>
        <CardDescription>what most of the grid ran each season</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="flex h-10 overflow-hidden rounded-md">
          {bands.map((b, i) => (
            <Hint key={`${b.label}-${b.from}`} label={`${b.from}–${b.to}: ${b.label}`}>
              <div
                className="flex min-w-0 items-center justify-center border-r border-background text-[10px] font-medium text-foreground/80 last:border-r-0"
                style={{
                  width: `${((b.to - b.from + 1) / span) * 100}%`,
                  backgroundColor: `color-mix(in oklab, var(--signal) ${14 + (i % 4) * 9}%, var(--surface-2))`,
                }}
              >
                <span className="truncate px-1">{b.to - b.from >= 4 ? b.label : ''}</span>
              </div>
            </Hint>
          ))}
        </div>
        <div className="flex justify-between font-mono text-[10px] text-faint-foreground">
          <span>{years[0]?.year}</span>
          <span>{years.at(-1)?.year}</span>
        </div>
      </CardContent>
    </Card>
  )
}

/** Wins per tyre maker per season, stacked. */
function TyreWars({ catalog }: { catalog: Catalog }) {
  const seasons = useMemo(() => tyreWars(catalog), [catalog])
  const makers = [...new Set(seasons.flatMap((s) => [...s.wins.keys()]))].filter((mk) =>
    seasons.some((s) => (s.wins.get(mk) ?? 0) > 0),
  )
  const color = (mk: number) => TYRE_COLORS[makers.indexOf(mk) % TYRE_COLORS.length]
  const max = Math.max(...seasons.map((s) => [...s.wins.values()].reduce((a, b) => a + b, 0)), 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <TyreIcon /> The tyre wars
        </CardTitle>
        <CardDescription>race wins by tyre maker, each season</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="overflow-x-auto">
          <div className="flex h-28 min-w-[640px] items-end gap-[2px]">
            {seasons.map((s) => {
              const total = [...s.wins.values()].reduce((a, b) => a + b, 0)
              const label = [...s.wins]
                .filter(([, w]) => w)
                .map(([mk, w]) => `${catalog.tyreMakers[mk]?.name} ${w}`)
                .join(', ')
              return (
                <Hint key={s.year} label={`${s.year}: ${label || 'no wins recorded'}`}>
                  <div
                    className="flex min-w-1 flex-1 flex-col-reverse overflow-hidden rounded-t-[2px]"
                    style={{ height: `${(total / max) * 100}%` }}
                  >
                    {[...s.wins].map(([mk, w]) =>
                      w ? (
                        <span
                          key={mk}
                          style={{ height: `${(w / total) * 100}%`, backgroundColor: color(mk) }}
                        />
                      ) : null,
                    )}
                  </div>
                </Hint>
              )
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
            {makers.map((mk) => (
              <li key={mk} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-[2px]"
                  style={{ backgroundColor: color(mk) }}
                  aria-hidden
                />
                {catalog.tyreMakers[mk]?.name}
              </li>
            ))}
          </ul>
          <span className="font-mono text-[10px] text-faint-foreground">
            {seasons[0]?.year}–{seasons.at(-1)?.year}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
