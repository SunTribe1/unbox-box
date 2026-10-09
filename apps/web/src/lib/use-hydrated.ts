import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/** False in the prerendered HTML and during hydration, true afterwards: for content that
 *  depends on what only the browser knows (the view, the loaded session). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
