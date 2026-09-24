import type { DuelSide } from '@unbox-box/tools'
import { cn } from '@/lib/utils'

/** Background classes for the two duel colours (`--driver-a` / `--driver-b`). */
export const DUEL_BG: Record<DuelSide, string> = { a: 'bg-driver-a', b: 'bg-driver-b' }

/** The round colour key for duel driver A or B. */
export function DuelDot({ side, className }: { side: DuelSide; className?: string }) {
  return (
    <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', DUEL_BG[side], className)} />
  )
}

/** The thin team-colour bar that sits before a driver code in tables and lists. */
export function DriverStripe({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('h-3.5 w-[3px] shrink-0 rounded-full', className)}
      style={{ backgroundColor: color }}
    />
  )
}
