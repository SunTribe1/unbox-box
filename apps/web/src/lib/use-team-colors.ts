'use client'

import { findDriver } from '@unbox-box/tools'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from 'next-themes'
import { useInsertionEffect, useMemo } from 'react'
import { metaQuery } from './data'
import { useApp } from './store'
import { duelColors, teamColor, type DuelColors } from './teams'

type Theme = 'dark' | 'light'

export function useThemeName(): Theme {
  const { resolvedTheme } = useTheme()
  return resolvedTheme === 'light' ? 'light' : 'dark'
}

function useMeta() {
  const sessionId = useApp((s) => s.sessionId)
  return useQuery({ ...metaQuery(sessionId ?? ''), enabled: !!sessionId }).data
}

/** Team colors for the current duel (pure; safe to call from any component). */
export function useDuelColors(): DuelColors | null {
  const meta = useMeta()
  const duel = useApp((s) => s.duel)
  const theme = useThemeName()
  return useMemo(() => {
    if (!meta || !duel) return null
    const team = (code: string) => findDriver(meta, code)?.team
    return duelColors(team(duel.a), team(duel.b), theme)
  }, [meta, duel, theme])
}

/** Driver code → team color, for tables, the replay map and legends. */
export function useDriverColor(): (code: string) => string {
  const meta = useMeta()
  const theme = useThemeName()
  return useMemo(() => {
    const teams = new Map(meta?.drivers.map((d) => [d.code, d.team]))
    return (code: string) => teamColor(teams.get(code), theme)
  }, [meta, theme])
}

/**
 * Paints the current duel in team colors: writes --driver-a / --driver-b on <html>, so every
 * `bg-driver-a`, chart series and map sector follows. An insertion effect runs before every
 * component's regular effects, so charts built in the same commit read the new colors.
 * Teammates (or look-alike teams) get a tinted B plus `data-duel-shared` for dashed lines.
 */
export function useTeamColors(): void {
  const colors = useDuelColors()
  useInsertionEffect(() => {
    if (!colors) return
    const root = document.documentElement
    root.style.setProperty('--driver-a', colors.a)
    root.style.setProperty('--driver-b', colors.b)
    root.toggleAttribute('data-duel-shared', colors.shared)
  }, [colors])
}
