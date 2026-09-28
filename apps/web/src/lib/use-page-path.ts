import { useSyncExternalStore } from 'react'

/** Fired by url-sync whenever it writes the address bar (pushState fires no event itself). */
export const URL_CHANGE_EVENT = 'unbox:url-change'

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(URL_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(URL_CHANGE_EVENT, onChange)
  }
}

/** The page this HTML was prerendered for: its path and its own heading. */
export interface PageHeading {
  path: string
  heading: string
}

/** True while the address bar is still on (or deeper inside) the prerendered page, so its
 *  own heading and title apply. Moving elsewhere in the app falls back to the view's. */
export function useOnPage(page: PageHeading | undefined): boolean {
  const path = useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => page?.path ?? '',
  )
  return !!page && path.startsWith(page.path)
}
