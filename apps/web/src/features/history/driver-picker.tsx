'use client'

import type { HistoryData } from '@unbox-box/tools'
import { ChevronsUpDownIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { type DuelSide } from '@unbox-box/tools'
import { DuelDot } from '@/components/driver-marks'
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

/** Searchable picker over every driver since 1950, most successful first. */
export function DriverPicker({
  data,
  value,
  onChange,
  side,
}: {
  data: HistoryData
  value: number
  onChange(index: number): void
  /** Head-to-head colour key; profiles pass none. */
  side?: DuelSide
}) {
  const [open, setOpen] = useState(false)
  const sorted = useMemo(
    () =>
      data.index.drivers
        .map((d, i) => ({ d, i }))
        .filter(({ d }) => d.starts > 0)
        .sort(
          (x, y) => y.d.wins - x.d.wins || y.d.podiums - x.d.podiums || y.d.starts - x.d.starts,
        ),
    [data],
  )
  const current = data.index.drivers[value]
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          aria-label={side ? `Driver ${side.toUpperCase()}` : 'Driver'}
        >
          <span className="flex min-w-0 items-center gap-2">
            {side && <DuelDot side={side} />}
            <span className="truncate">{current?.name}</span>
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Search 900+ drivers since 1950…" />
          <CommandList>
            <CommandEmpty>No driver found.</CommandEmpty>
            <CommandGroup>
              {sorted.map(({ d, i }) => (
                <CommandItem
                  key={d.id}
                  value={`${d.name} ${d.abbr} ${d.id}`}
                  onSelect={() => {
                    onChange(i)
                    setOpen(false)
                  }}
                >
                  <span className="truncate">{d.name}</span>
                  <span className="ml-auto shrink-0 numeric text-[11px] text-muted-foreground">
                    {d.firstYear}
                    {d.lastYear !== d.firstYear &&
                      `–${d.active ? 'now' : String(d.lastYear).slice(2)}`}
                    {d.wins > 0 && ` · ${d.wins}W`}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
