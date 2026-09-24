'use client'

import { formatRaceControl, type Replay } from '@unbox-box/tools'
import { FlagIcon, MegaphoneIcon, ShieldAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChequeredFlagIcon, SafetyCarIcon } from '@/components/icons'
import { AnimatePresence, m } from 'motion/react'
import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty'
import { usePlayback } from '@/lib/store'
import { useThrottledTime } from './use-replay'

function icon(message: string, category: string) {
  if (/CHEQUERED/.test(message)) return <ChequeredFlagIcon className="size-3.5" />
  if (/SAFETY CAR/.test(message)) return <SafetyCarIcon className="size-3.5" />
  if (category === 'Flag') return <FlagIcon className="size-3.5" />
  if (/PENALTY|INVESTIGATION|NOTED/.test(message))
    return <ShieldAlertIcon className="size-3.5 text-signal-ink" />
  return <MegaphoneIcon className="size-3.5" />
}

export function RaceControlFeed({ replay }: { replay: Replay }) {
  const time = useThrottledTime(400)
  const seek = usePlayback((s) => s.seek)
  const recent = useMemo(
    () =>
      replay.messages
        .filter((msg) => msg.t <= time)
        .slice(-6)
        .reverse(),
    [replay, time],
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <ChequeredFlagIcon />
          Race control
        </CardTitle>
        <CardDescription>{replay.messages.length} messages</CardDescription>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <Empty className="gap-2 border-0 p-4 md:p-6">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FlagIcon />
              </EmptyMedia>
              <EmptyDescription>
                Flags, penalties and messages appear as the race unfolds.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="grid gap-2" aria-live="polite">
            {/* popLayout: an outgoing message leaves the flow at once, so a burst of new ones
                under fast playback never stacks on top of it. */}
            <AnimatePresence initial={false} mode="popLayout">
              {recent.map((msg) => (
                <m.li
                  key={`${msg.t}-${msg.message}`}
                  layout="position"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-2.5 text-sm"
                >
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => seek(msg.t)}
                    className="mt-0.5 h-5 min-w-9 rounded font-mono text-[10px] text-muted-foreground hover:text-foreground"
                    aria-label={`Jump to lap ${msg.lap ?? ''}`}
                  >
                    L{msg.lap ?? '–'}
                  </Button>
                  <span className="mt-0.5 text-muted-foreground">
                    {icon(msg.message, msg.category)}
                  </span>
                  <span className="leading-snug">{formatRaceControl(msg.message)}</span>
                </m.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
