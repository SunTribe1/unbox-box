/** `standalone` pages sit outside the app shell (no rail or tab bar). */
/** Every section, with a link that works on the bundled demo data and on the full archive,
 *  and something on screen that proves the page finished loading. */
import { expect, type Page } from '@playwright/test'

export const PAGES: readonly {
  name: string
  path: string
  ready: string
  text?: boolean
  standalone?: boolean
}[] = [
  { name: 'Lap Duel', path: '/duel/2025-italian-grand-prix-q/', ready: '1:18.792', text: true },
  { name: 'History', path: '/history/', ready: 'Head to head' },
  { name: 'Race Archive', path: '/races/1988/', ready: '1988 season' },
  { name: 'Race weekend', path: '/races/1988/3/', ready: 'Monaco Grand Prix' },
  { name: 'Circuits', path: '/circuits/', ready: 'Circuits' },
  { name: 'Circuit page', path: '/circuits/monza/', ready: 'Monza' },
  { name: 'Record Book', path: '/records/', ready: 'Record Book' },
  { name: 'Engines & Tyres', path: '/engines/', ready: 'Engines & Tyres' },
  { name: 'Nations', path: '/nations/', ready: 'Nations' },
  { name: 'Help', path: '/help/', ready: 'Help & feedback' },
  { name: 'Help for developers', path: '/help/#dev-architecture', ready: 'Tool reference' },
  { name: 'Credits', path: '/credits/', ready: 'Credits and licences', standalone: true },
  { name: 'Landing', path: '/', ready: 'Every lap, unboxed.', standalone: true },
]

/** Waits for the page's proof of life: a heading, or (for Lap Duel) the pole time. */
export async function ready(page: Page, entry: (typeof PAGES)[number]) {
  const target = entry.text
    ? page.getByText(entry.ready).first()
    : page.getByRole('heading', { name: entry.ready, exact: true }).first()
  await expect(target).toBeVisible()
}

export const VIEWPORTS = [
  { name: 'phone', width: 360, height: 780 },
  { name: 'large phone', width: 430, height: 932 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1920, height: 1080 },
] as const

/** Waits until entrance animations have finished, so contrast is measured at full opacity.
 *  Staggered lists (the circuit index) take longer than any fixed wait on a slow CI machine. */
export async function settled(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          // Endless animations (loading shimmers) never settle; entrances are finite.
          const running = document
            .getAnimations()
            .some((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity)
          // Motion writes opacity inline while it animates; anything between 0 and 1 is mid-fade.
          const fading = [...document.querySelectorAll<HTMLElement>('[style*="opacity"]')].some(
            (el) => {
              const o = Number(el.style.opacity)
              return el.style.opacity !== '' && o > 0 && o < 1
            },
          )
          return running || fading
        }),
      { timeout: 10_000, intervals: [100, 200, 400] },
    )
    .toBe(false)
}
