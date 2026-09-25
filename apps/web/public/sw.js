/* Unbox Box service worker: installable app, offline shell, and sessions you've opened stay
 * available offline. Strategy per request:
 *  - build assets (/_next/static, fonts, icons): cache first (content-hashed, never change)
 *  - data JSON (session files, history): stale-while-revalidate, so it's instant and
 *    refreshes in the background; index.json is network first so new sessions appear
 *  - pages: network first, falling back to the cached shell when offline. Every path under a
 *    view (/duel/…/…/) is the same page, so it is cached once, under the view's root.
 */
const VERSION = 'v3'
const PREFIX = 'unboxbox-'
const STATIC = `${PREFIX}static-${VERSION}`
const DATA = `${PREFIX}data-${VERSION}`
const PAGES = `${PREFIX}pages-${VERSION}`
const DATA_LIMIT = 400 // entries; oldest evicted first
// The data host (NEXT_PUBLIC_DATA_BASE), passed as ?data=<origin> at registration. Only this
// origin and our own are cached; every other cross-origin request passes straight through.
const DATA_ORIGIN = new URL(self.location.href).searchParams.get('data') || self.location.origin

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((c) => c.addAll(['/']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // pw- is the name caches had before the rename.
            .filter((k) => (k.startsWith(PREFIX) || k.startsWith('pw-')) && !k.endsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function trim(cacheName, limit) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((k) => cache.delete(k)))
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  // Awaited so the browser can't suspend the worker before the copy is stored.
  if (response.ok) await (await caches.open(STATIC)).put(request, response.clone())
  return response
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(DATA)
  const cached = await cache.match(event.request)
  const network = fetch(event.request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(event.request, response.clone())
        await trim(DATA, DATA_LIMIT)
      }
      return response
    })
    .catch(() => cached || Response.error())
  if (cached) {
    event.waitUntil(network)
    return cached
  }
  return network
}

async function networkFirst(request, cacheName, key = request) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(key, response.clone())
    return response
  } catch {
    return (await cache.match(key)) || (await cache.match('/')) || Response.error()
  }
}

/** /duel/2026-…/NOR-49-vs-ANT-59/?corner=10 → /duel/: the page every path under a view serves. */
function pageKey(url) {
  const first = url.pathname.split('/').find(Boolean)
  return first && !first.includes('.') ? `${url.origin}/${first}/` : `${url.origin}/`
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  const ours = url.origin === self.location.origin
  if (!ours && url.origin !== DATA_ORIGIN) return
  const isData = url.pathname.endsWith('.json') && /\/(sessions|history|data)\//.test(url.pathname)
  if (url.pathname.endsWith('/index.json')) {
    event.respondWith(networkFirst(request, DATA))
  } else if (isData) {
    event.respondWith(staleWhileRevalidate(event))
  } else if (!ours) {
    return
  } else if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request))
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGES, pageKey(url)))
  }
})
