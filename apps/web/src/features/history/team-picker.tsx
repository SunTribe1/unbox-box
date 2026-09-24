'use client'

import type { HistoryData } from '@unbox-box/tools'
import { ChevronsUpDownIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** Searchable picker over every constructor since 1950: this season's grid first, then by wins. */
export function TeamPicker({
  data,
  value,
  onChange,
  current,
}: {
  data: HistoryData
  value: number
  onChange(index: number): void
  /** Constructors racing in the latest season. */
  current: Set<number>
}) {
  const [open, setOpen] = useState(false)
  const groups = useMemo(() => {
    const all = data.index.constructors
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => (c.starts ?? 0) > 0)
      .sort((x, y) => (y.c.wins ?? 0) - (x.c.wins ?? 0) || (y.c.starts ?? 0) - (x.c.starts ?? 0))
    return {
      now: all.filter(({ i }) => current.has(i)),
      past: all.filter(({ i }) => !current.has(i)),
    }
  }, [data, current])
  const item = ({ c, i }: (typeof groups.now)[number]) => (
    <CommandItem
      key={c.id}
      value={`${c.name} ${c.fullName ?? ''} ${c.id}`}
      onSelect={() => {
        onChange(i)
        setOpen(false)
      }}
    >
      <span className="truncate">{c.name}</span>
      <span className="ml-auto shrink-0 numeric text-[11px] text-muted-foreground">
        {c.wins ?? 0} wins
      </span>
    </CommandItem>
  )
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between" aria-label="Team">
          <span className="truncate">{data.index.constructors[value]?.name}</span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Search every team since 1950…" />
          <CommandList>
            <CommandEmpty>No team found.</CommandEmpty>
            <CommandGroup heading={`${data.index.latestSeason} grid`}>
              {groups.now.map(item)}
            </CommandGroup>
            <CommandGroup heading="All-time">{groups.past.map(item)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
