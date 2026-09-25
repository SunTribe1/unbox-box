'use client'

import { useEffect } from 'react'
import { DATA_BASE } from '@/lib/data-base'

/** Registers the offline service worker (public/sw.js) in production builds, after load so
 *  it never competes with the first paint. Where /sw.js isn't served (hosted previews under
 *  a sub-path) registration just fails quietly and the app works as a normal site. */
export function ServiceWorker(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    // Tell the worker which data host it may cache (see public/sw.js).
    const dataOrigin = new URL(DATA_BASE, location.href).origin
    const url = `/sw.js?data=${encodeURIComponent(dataOrigin)}`
    const register = () =>
      navigator.serviceWorker.register(url).catch((error: unknown) => {
        console.warn('[unbox-box] offline mode unavailable', error)
      })
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])
  return null
}
