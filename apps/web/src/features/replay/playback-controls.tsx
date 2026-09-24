'use client'

import {
  leaderLapAt,
  PLAYBACK_SPEEDS,
  timeOfLap,
  trackStatusAt,
  type PlaybackSpeed,
  type Replay,
} from '@unbox-box/tools'
import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from 'lucide-react'
import { useMemo } from 'react'
import { ButtonGroup } from '@/components/ui/button-group'
import { SafetyCarIcon } from '@/components/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { usePlayback } from '@/lib/store'
import { cn } from '@/lib/utils'
import { useThrottledTime } from './use-replay'

const STATUS = {
  green: { label: 'Green', className: 'bg-success/15 text-success' },
  sc: { label: 'Safety car', className: 'bg-tyre-medium/20 text-foreground', car: true },
  vsc: { label: 'Virtual SC', className: 'bg-tyre-medium/20 text-foreground', car: true },
  red: { label: 'Red flag', className: 'bg-danger/15 text-danger' },
} as const

export function PlaybackControls({ replay }: { replay: Replay }) {
  const playing = usePlayback((s) => s.playing)
  const speed = usePlayback((s) => s.speed)
  const set = usePlayback((s) => s.set)
  const seek = usePlayback((s) => s.seek)
  const time = useThrottledTime(250)
  const lap = useMemo(() => leaderLapAt(replay, time), [replay, time])
  const status = STATUS[trackStatusAt(replay, time)]
  const finished = time >= replay.duration - 1

  return (
    <div className="flex flex-wrap items-center gap-3">
      <ButtonGroup aria-label="Playback">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous lap"
          onClick={() => seek(timeOfLap(replay, Math.max(1, lap - 1)))}
        >
          <SkipBackIcon />
        </Button>
        <Button
          variant="signal"
          size="sm"
          className="w-24"
          onClick={() => {
            if (finished) seek(0)
            set({ playing: !playing })
          }}
          aria-label={playing ? 'Pause replay' : 'Play replay'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}{' '}
          {playing ? 'Pause' : finished ? 'Replay' : 'Play'}
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next lap"
          onClick={() => seek(timeOfLap(replay, Math.min(replay.totalLaps, lap + 1)))}
        >
          <SkipForwardIcon />
        </Button>
      </ButtonGroup>
      <ToggleGroup
        type="single"
        size="sm"
        value={String(speed)}
        onValueChange={(v) => v && set({ speed: Number(v) as PlaybackSpeed })}
        aria-label="Playback speed"
      >
        {PLAYBACK_SPEEDS.map((s) => (
          <ToggleGroupItem key={s} value={String(s)} className="font-mono">
            {s}×
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="ml-auto flex items-center gap-3">
        <Badge className={cn('border-transparent', status.className)}>
          {'car' in status && <SafetyCarIcon />}
          {status.label}
        </Badge>
        <div className="numeric text-sm">
          <span className="text-muted-foreground">LAP </span>
          <span className="text-lg font-semibold">{lap}</span>
          <span className="text-muted-foreground">/{replay.totalLaps}</span>
        </div>
      </div>
    </div>
  )
}
