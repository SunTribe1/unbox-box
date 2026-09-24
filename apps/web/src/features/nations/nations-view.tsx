'use client'

import { nationSummaries, type Catalog, type HistoryData } from '@unbox-box/tools'
import { SearchIcon } from 'lucide-react'
import { m } from 'motion/react'
import { useMemo, useState } from 'react'
import { Flag } from '@/components/flag'
import { HelpText } from '@/components/help-text'
import { GlobeIcon } from '@/components/icons'
import { MiniStats } from '@/components/mini-stats'
import { PageHeader } from '@/components/page-header'
import { TileButton } from '@/components/tile-button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { ErrorState } from '@/components/ui/error-state'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { enter, riseIn, stagger } from '@/lib/motion'
import { useApp } from '@/lib/store'
import { stripAccents } from '@unbox-box/tools'
import { openNation } from '../archive/links'
import { useCatalog } from '../archive/use-archive'
import { useHistoryData } from '../history/use-history'
import { NationPage } from './nation-page'

const CONTINENTS: [string, string][] = [
  ['all', 'All'],
  ['europe', 'Europe'],
  ['north-america', 'N. America'],
  ['south-america', 'S. America'],
  ['asia', 'Asia'],
  ['oceania', 'Oceania'],
  ['africa', 'Africa'],
]

type Sort = 'wins' | 'drivers' | 'races'

/** Nations: every country with an F1 driver, team or Grand Prix, and a page per country. */
export function NationsView() {
  const history = useHistoryData()
  const catalog = useCatalog()
  const nation = useApp((s) => s.archive.nation)
  const error = history.error ?? catalog.error
  if (error) return <ErrorState title="Nations unavailable" error={error} />
  if (!history.data || !catalog.data) return <Skeleton className="h-[560px] rounded-xl" />
  return nation ? (
    <NationPage data={history.data} catalog={catalog.data} code={nation} />
  ) : (
    <NationIndex data={history.data} catalog={catalog.data} />
  )
}

function NationIndex({ data, catalog }: { data: HistoryData; catalog: Catalog }) {
  const [continent, setContinent] = useState('all')
  const [sort, setSort] = useState<Sort>('wins')
  const [query, setQuery] = useState('')
  const all = useMemo(() => nationSummaries(data, catalog), [data, catalog])
  const q = stripAccents(query.trim()).toLowerCase()
  const shown = all
    .filter((n) => continent === 'all' || n.continent === continent)
    .filter((n) => !q || stripAccents(n.name).toLowerCase().includes(q))
    .sort((a, b) => b[sort] - a[sort] || b.wins - a.wins || a.name.localeCompare(b.name))

  return (
    <m.div className="grid gap-4" {...enter}>
      <PageHeader
        icon={GlobeIcon}
        title="Nations"
        description={
          <>{all.length} countries have sent a driver, built a team or hosted a Grand Prix.</>
        }
        actions={
          <>
            <InputGroup className="w-48">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search countries"
                aria-label="Search countries"
              />
            </InputGroup>
            <ToggleGroup
              type="single"
              value={sort}
              onValueChange={(v) => v && setSort(v as Sort)}
              aria-label="Sort by"
            >
              <ToggleGroupItem value="wins">Wins</ToggleGroupItem>
              <ToggleGroupItem value="drivers">Drivers</ToggleGroupItem>
              <ToggleGroupItem value="races">Hosted</ToggleGroupItem>
            </ToggleGroup>
          </>
        }
      />
      <ToggleGroup
        type="single"
        value={continent}
        onValueChange={(v) => v && setContinent(v)}
        aria-label="Continent"
        className="no-scrollbar max-w-full justify-start overflow-x-auto"
      >
        {CONTINENTS.map(([id, label]) => (
          <ToggleGroupItem key={id} value={id} className="shrink-0">
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {shown.length ? (
        <m.ul
          key={`${continent}-${sort}`}
          className="grid gap-3 @min-[480px]:grid-cols-2 @min-[800px]:grid-cols-3 @min-[1200px]:grid-cols-4 @min-[1600px]:grid-cols-5"
          variants={stagger(0.015)}
          initial="hidden"
          animate="show"
        >
          {shown.map((n) => (
            <m.li key={n.code} variants={riseIn}>
              <TileButton onClick={() => openNation(n.code)} className="gap-3">
                <div className="flex items-center gap-3">
                  <Flag code={n.code} className="h-6 w-8 rounded-[3px]" />
                  <span className="grid min-w-0">
                    <span className="truncate text-sm font-semibold">{n.name}</span>
                    <span className="text-caption text-muted-foreground">
                      {n.titles ? `${n.titles} drivers’ title${n.titles > 1 ? 's' : ''}` : ' '}
                    </span>
                  </span>
                </div>
                <MiniStats
                  items={[
                    ['Drivers', n.drivers],
                    ['Wins', n.wins],
                    ['GPs hosted', n.races],
                  ]}
                />
              </TileButton>
            </m.li>
          ))}
        </m.ul>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No countries match</EmptyTitle>
            <EmptyDescription>Try another name or continent.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      <HelpText>
        A driver counts for their racing nationality; wins are that nation&apos;s drivers&apos;
        Grand Prix wins. Flags from flag-icons (MIT).
      </HelpText>
    </m.div>
  )
}
