'use client'

import { championshipProgression, type HistoryData, type HistoryStandings } from '@unbox-box/tools'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { PodiumIcon } from '@/components/icons'
import { SaveImageButton } from '@/components/save-image-button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { teamColor, tint } from '@/lib/teams'
import { useThemeName } from '@/lib/use-team-colors'
import { openDriver, openTeam } from '../archive/links'

const SeasonChart = dynamic(() => import('./season-chart').then((x) => x.SeasonChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full sm:h-[340px]" />,
})

type Kind = 'drivers' | 'constructors'

/** Distinct colours for contenders, best-placed first: the team colour, tinted when a
 *  higher-placed teammate already has it. */
function contenderColors(
  data: HistoryData,
  season: number,
  kind: Kind,
  ids: number[],
  theme: 'dark' | 'light',
): Map<number, string> {
  const teamOfDriver = new Map<number, string>()
  data.results.race.forEach((race, row) => {
    if (data.index.races.year[race] === season) {
      const c = data.index.constructors[data.results.constructor[row]!]?.name
      if (c) teamOfDriver.set(data.results.driver[row]!, c)
    }
  })
  const seen = new Map<string, number>()
  return new Map(
    ids.map((id) => {
      const team = kind === 'drivers' ? teamOfDriver.get(id) : data.index.constructors[id]?.name
      const base = teamColor(team, theme)
      const n = seen.get(base) ?? 0
      seen.set(base, n + 1)
      return [id, n ? tint(base, 0.4, theme) : base] as const
    }),
  )
}

/** A season's title fight: points after every round (official standings), with the final
 *  table beside it. */
export function Championship({
  data,
  standings,
  season,
}: {
  data: HistoryData
  standings: HistoryStandings | undefined
  season: number
}) {
  const [kind, setKind] = useState<Kind>('drivers')
  const progression = useMemo(
    () => (standings ? championshipProgression(data, standings, season, kind) : null),
    [data, standings, season, kind],
  )
  const theme = useThemeName()
  const colors = useMemo(
    () => contenderColors(data, season, kind, progression?.rows.map((r) => r.id) ?? [], theme),
    [data, season, kind, progression, theme],
  )
  const colorOf = (id: number) => colors.get(id) ?? 'var(--muted-foreground)'
  const name = (id: number) =>
    kind === 'drivers' ? data.index.drivers[id]?.name : data.index.constructors[id]?.name
  const noConstructors = kind === 'constructors' && season < 1958

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>
            <PodiumIcon />
            {season} championship
          </CardTitle>
          <CardDescription>points after every round</CardDescription>
        </div>
        <CardAction className="flex flex-wrap items-center justify-end gap-2">
          <ToggleGroup
            type="single"
            value={kind}
            onValueChange={(v) => v && setKind(v as Kind)}
            aria-label="Championship"
          >
            <ToggleGroupItem value="drivers">Drivers</ToggleGroupItem>
            <ToggleGroupItem value="constructors">Constructors</ToggleGroupItem>
          </ToggleGroup>
          <SaveImageButton name={`${season} championship`} />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 @min-[1000px]:grid-cols-[minmax(0,1fr)_280px]">
        {noConstructors ? (
          <p className="text-sm text-muted-foreground">
            The constructors&apos; championship began in 1958.
          </p>
        ) : !progression ? (
          <Skeleton className="h-[300px] w-full sm:h-[340px]" />
        ) : (
          <>
            <SeasonChart progression={progression} colorOf={colorOf} />
            <ol className="grid content-start gap-0.5" aria-label="Final standings">
              {progression.rows.slice(0, 12).map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() =>
                      kind === 'drivers' ? openDriver(data, row.id) : openTeam(data, row.id)
                    }
                    className="grid w-full grid-cols-[1.5rem_auto_1fr_auto] items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-surface-2"
                  >
                    <span className="numeric text-xs text-faint-foreground">
                      {row.position || '–'}
                    </span>
                    <span
                      className="h-3.5 w-[3px] rounded-full"
                      style={{ backgroundColor: colorOf(row.id) }}
                      aria-hidden
                    />
                    <span className="truncate">{name(row.id)}</span>
                    <span className="numeric text-xs text-muted-foreground">
                      {row.points.at(-1) ?? 0}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
      </CardContent>
    </Card>
  )
}
