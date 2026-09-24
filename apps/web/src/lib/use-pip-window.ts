'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>
  window: Window | null
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture
  }
}

const subscribeNoop = () => () => {}

/** Whether Document Picture-in-Picture exists (Chromium). False during SSR. */
export function usePipSupported(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => 'documentPictureInPicture' in window,
    () => false,
  )
}

/** Copies the app's styles and theme class into the floating window so portalled React
 *  content looks identical there. */
function mirrorStyles(target: Window) {
  for (const sheet of [...document.styleSheets]) {
    try {
      const css = [...sheet.cssRules].map((r) => r.cssText).join('\n')
      const style = target.document.createElement('style')
      style.textContent = css
      target.document.head.append(style)
    } catch {
      if (sheet.href) {
        const link = target.document.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        target.document.head.append(link)
      }
    }
  }
  const html = target.document.documentElement
  html.className = document.documentElement.className
  html.style.cssText = document.documentElement.style.cssText
  target.document.body.className = 'bg-background text-foreground antialiased'
}

/** Opens a floating always-on-top window and returns its body as a portal target. */
export function usePipWindow(size = { width: 340, height: 720 }) {
  const [pip, setPip] = useState<Window | null>(null)

  const open = useCallback(async () => {
    const api = window.documentPictureInPicture
    if (!api) return
    const win = await api.requestWindow(size)
    mirrorStyles(win)
    win.addEventListener('pagehide', () => setPip(null), { once: true })
    setPip(win)
  }, [size])

  const close = useCallback(() => pip?.close(), [pip])

  // Keep the floating window in the app's theme (and team colors) as they change.
  useEffect(() => {
    if (!pip) return
    const sync = () => {
      pip.document.documentElement.className = document.documentElement.className
      pip.document.documentElement.style.cssText = document.documentElement.style.cssText
    }
    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    })
    // Stylesheets loaded later (lazy view chunks) are mirrored too.
    const styles = new MutationObserver((records) => {
      for (const node of records.flatMap((r) => [...r.addedNodes])) {
        if (node instanceof HTMLStyleElement || node instanceof HTMLLinkElement) {
          pip.document.head.append(node.cloneNode(true))
        }
      }
    })
    styles.observe(document.head, { childList: true })
    return () => {
      observer.disconnect()
      styles.disconnect()
    }
  }, [pip])

  useEffect(() => () => pip?.close(), [pip])

  return { pip, open, close }
}
