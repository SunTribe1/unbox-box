'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { useApp } from '@/lib/store'
import { NAV } from './nav'

export const SHORTCUT_GROUPS: { title: string; items: [keys: string[], label: string][] }[] = [
  {
    title: 'Anywhere',
    items: [
      [['⌘', 'K'], 'Search sessions, drivers and corners'],
      [['/'], 'Ask the Race Engineer'],
      ...NAV.filter((n) => n.view !== 'help').map((n, i): [string[], string] => [
        [String(i + 1)],
        n.label,
      ]),
      [['Esc'], 'Clear the highlighted corner'],
      [['?'], 'Show these shortcuts'],
    ],
  },
  {
    title: 'Race Replay',
    items: [
      [['Space'], 'Play or pause'],
      [['←', '→'], 'Back or forward 10 seconds'],
      [['⇧', '←'], 'Previous lap'],
      [['⇧', '→'], 'Next lap'],
    ],
  },
]

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/** `?` opens a cheat sheet of every keyboard shortcut. */
export function ShortcutsDialog() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '?' || isTyping(e.target) || useApp.getState().paletteOpen) return
      e.preventDefault()
      setOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] gap-5 overflow-y-auto shadow-pop sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-title">Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Everything you can click, you can also do from the keyboard.
          </DialogDescription>
        </DialogHeader>
        {SHORTCUT_GROUPS.map((group) => (
          <section key={group.title} className="grid gap-1.5">
            <h3 className="text-label text-faint-foreground">{group.title}</h3>
            <dl className="grid">
              {group.items.map(([keys, label]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-border/60 py-2 last:border-0"
                >
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd>
                    <KbdGroup>
                      {keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </KbdGroup>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  )
}
