'use client'

import { useSyncExternalStore } from 'react'

/** The last few sessions this visitor opened, newest first (a per-browser convenience;
 *  storage can be unavailable in private windows, so every access is guarded). */

const KEY = 'unboxbox:recent-sessions'
const MAX = 5
const listeners = new Set<() => void>()
let cache: string[] | null = null

function read(): string[] {
  if (cache) return cache
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    cache = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    cache = []
  }
  return cache
}

export function rememberSession(id: string): void {
  const next = [id, ...read().filter((x) => x !== id)].slice(0, MAX)
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage full or blocked: keep the in-memory list for this visit.
  }
  for (const l of listeners) l()
}

const EMPTY: string[] = []

export function useRecentSessions(): string[] {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    read,
    () => EMPTY,
  )
}
