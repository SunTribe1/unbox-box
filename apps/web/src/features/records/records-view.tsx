'use client'

import {
  formatAge,
  formatMillis,
  recordBoards,
  RECORD_SCOPES,
  type HistoryData,
  type RecordBoard,
  type RecordRow,
  type RecordScope,
} from '@unbox-box/tools'
import { AnimatePresence, m } from 'motion/react'
import { useMemo } from 'react'
import { HelpText } from '@/components/help-text'
import { MedalIcon } from '@/components/icons'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState } from '@/components/ui/error-state'
import { GrowBar } from '@/components/ui/grow-bar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { enter, riseIn, stagger } from '@/lib/motion'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { DriverLink, openRace, TeamLink } from '../archive/links'
import { DECADES, eraLabel, eraRange } from '../archive/use-archive'
import { useHistoryData } from '../history/use-history'
import { Moments } from './moments'

type Scope = RecordScope | 'moments'
const SCOPE_LABEL: Record<Scope, string> = {
  drivers: 'Drivers',
  teams: 'Teams',
  moments: 'Moments',
}

function formatRecord(board: RecordBoard, value: number): string {
  if (board.unit === 'share') return `${(value * 100).toFixed(1)}%`
  if (board.unit === 'age') return formatAge(value)
  if (board.unit === 'ms') return formatMillis(value)
  if (board.unit === 'points') return value.toLocaleString('en-GB', { maximumFractionDigits: 1 })
  return value.toLocaleString('en-GB')
}

/** The Record Book: every leaderboard for drivers and teams, with an era filter; plus race
 *  "moments" (closest finishes, biggest wins, best pit crews). Engine and tyre makers have
 *  their own pages. */
export function RecordsView() {
  const history = useHistoryData()
  const archive = useApp((s) => s.archive)
  const setArchive = useApp((s) => s.setArchive)
  const scope = ([...RECORD_SCOPES, 'moments'] as string[]).includes(archive.scope ?? '')
    ? (archive.scope as Scope)
    : 'drivers'
  const era = archive.era ?? 'all'
  const filters = eraRange(era)

  const boards = useMemo(
    () => (history.data && scope !== 'moments' ? recordBoards(history.data, scope, filters) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history.data, scope, era],
  )
  const board = boards.find((b) => b.id === archive.board) ?? boards[0]

  if (history.error) return <ErrorState title="Record book unavailable" error={history.error} />
  if (!history.data) return <Skeleton className="h-[560px] rounded-xl" />

  return (
    <m.div className="grid gap-4" {...enter}>
      <PageHeader
        icon={MedalIcon}
        title="Record Book"
        description={<>Every Grand Prix since 1950. Pick a board; names open their profiles.</>}
        actions={
          <>
            <ToggleGroup
              type="single"
              value={scope}
              onValueChange={(v) => v && setArchive({ scope: v, board: undefined })}
              aria-label="Record scope"
            >
              {(Object.keys(SCOPE_LABEL) as Scope[]).map((s) => (
                <ToggleGroupItem key={s} value={s}>
                  {SCOPE_LABEL[s]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {scope !== 'moments' && (
              <Select value={era} onValueChange={(v) => setArchive({ era: v })}>
                <SelectTrigger className="w-32" aria-label="Era">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  {era !== 'all' && !/^\d{4}s$/.test(era) && (
                    <SelectItem value={era}>{eraLabel(era)}</SelectItem>
                  )}
                  {DECADES.map((d) => (
                    <SelectItem key={d} value={`${d}s`}>
                      {d}s
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        }
      />

      {scope === 'moments' ? (
        <Moments data={history.data} />
      ) : (
        <div className="grid items-start gap-4 @min-[900px]:grid-cols-[15rem_minmax(0,1fr)]">
          <BoardList
            boards={boards}
            active={board?.id}
            onPick={(id) => setArchive({ board: id })}
          />
          {board && (
            <Leaderboard
              key={`${scope}-${board.id}-${era}`}
              data={history.data}
              board={board}
              era={era}
            />
          )}
        </div>
      )}
      <HelpText>
        Counts come from race results, so the era filter applies; boards marked “all time” come from
        F1DB career totals. Rates need 25 starts in the era. Ages are on race day.
      </HelpText>
    </m.div>
  )
}

function BoardList({
  boards,
  active,
  onPick,
}: {
  boards: RecordBoard[]
  active?: string
  onPick: (id: string) => void
}) {
  return (
    <>
      {/* Phones: a select; wider: a list. */}
      <Select value={active} onValueChange={onPick}>
        <SelectTrigger className="w-full @min-[900px]:hidden" aria-label="Record">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {boards.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Card className="hidden gap-0 p-1.5 @min-[900px]:flex">
        <nav aria-label="Records" className="grid gap-0.5">
          {boards.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-current={b.id === active ? 'true' : undefined}
              onClick={() => onPick(b.id)}
              className={cn(
                'relative flex min-h-9 items-center justify-between gap-2 rounded-md px-3 text-left text-sm text-muted-foreground transition-colors hover:text-foreground',
                b.id === active && 'text-foreground',
              )}
            >
              {b.id === active && (
                <m.span
                  layoutId="record-pill"
                  className="absolute inset-0 rounded-md bg-surface-2"
                  transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                />
              )}
              <span className="relative truncate">{b.label}</span>
              {b.allTime && (
                <span className="relative text-[10px] text-faint-foreground uppercase">
                  all time
                </span>
              )}
            </button>
          ))}
        </nav>
      </Card>
    </>
  )
}

function Subject({ data, board, row }: { data: HistoryData; board: RecordBoard; row: RecordRow }) {
  return board.scope === 'drivers' ? (
    <DriverLink data={data} driver={row.subject} />
  ) : (
    <TeamLink data={data} team={row.subject} />
  )
}

function Leaderboard({ data, board, era }: { data: HistoryData; board: RecordBoard; era: string }) {
  const values = board.rows.map((r) => r.value)
  const best = board.ascending ? Math.min(...values) : Math.max(...values)
  const worst = board.ascending ? Math.max(...values) : 0
  const share = (v: number) =>
    board.ascending
      ? worst > best
        ? 0.25 + (0.75 * (worst - v)) / (worst - best)
        : 1
      : v / (best || 1)
  const race = (r: RecordRow) =>
    r.year != null && r.round != null
      ? `${r.year} ${data.index.races.name[data.index.races.year.findIndex((y, i) => y === r.year && data.index.races.round[i] === r.round)] ?? ''}`.trim()
      : r.year != null
        ? String(r.year)
        : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <MedalIcon /> {board.label}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-1.5">
          {board.allTime
            ? 'All time, from career totals'
            : era === 'all'
              ? 'All time'
              : `The ${era}`}
          {board.allTime && era !== 'all' && (
            <Badge variant="outline">Era filter doesn’t apply</Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {board.rows.length ? (
          <m.ol
            className="grid gap-1.5"
            aria-label={`${board.label} leaderboard`}
            variants={stagger(0.02)}
            initial="hidden"
            animate="show"
          >
            <AnimatePresence initial={false}>
              {board.rows.map((r, i) => (
                <m.li
                  key={`${r.subject}-${r.year ?? ''}-${r.round ?? ''}`}
                  variants={riseIn}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(2rem,18%)_4.75rem] items-center gap-x-3 gap-y-0.5 text-sm @min-[560px]:grid-cols-[1.75rem_minmax(0,1fr)_minmax(4rem,30%)_5.5rem]"
                >
                  <span
                    className={cn(
                      'numeric text-muted-foreground',
                      i < 3 && 'font-semibold text-foreground',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="grid min-w-0">
                    <Subject data={data} board={board} row={r} />
                    {(race(r) || r.detail) && (
                      <span className="truncate text-caption text-muted-foreground">
                        {r.round != null ? (
                          <button
                            type="button"
                            className="hover:text-signal-ink"
                            onClick={() => openRace(r.year!, r.round!)}
                          >
                            {race(r)}
                          </button>
                        ) : (
                          race(r)
                        )}
                        {r.detail}
                      </span>
                    )}
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <GrowBar
                      value={share(r.value)}
                      className={cn('rounded-full', i === 0 ? 'bg-signal' : 'bg-signal/60')}
                    />
                  </span>
                  <span className="text-right numeric font-medium">
                    {formatRecord(board, r.value)}
                  </span>
                </m.li>
              ))}
            </AnimatePresence>
          </m.ol>
        ) : (
          <HelpText>Nothing to rank in this era.</HelpText>
        )}
      </CardContent>
    </Card>
  )
}
