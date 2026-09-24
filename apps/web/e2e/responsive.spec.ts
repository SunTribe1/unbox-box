import { expect, test, type Page } from '@playwright/test'
import { PAGES, ready, VIEWPORTS } from './support/pages'

// One run covers every width; the viewport is set per test, so skip the mobile project.
test.skip(({ isMobile }) => isMobile, 'the matrix sets its own viewports')

/** Elements that stick out past the right edge without a scrolling parent to hold them. */
async function overflowing(page: Page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth
    const clipped = (el: Element) => {
      for (let p = el.parentElement; p && p.tagName !== 'MAIN'; p = p.parentElement) {
        if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(p).overflowX))
          return true
      }
      return false
    }
    return [...document.querySelectorAll('main *')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && r.right > width + 1 && !clipped(el)
      })
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`)
  })
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const page of PAGES) {
      test(`${page.name} fits the screen`, async ({ page: p }) => {
        await p.goto(page.path)
        await ready(p, page)
        expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
          viewport.width,
        )
        expect(await overflowing(p)).toEqual([])
        if (page.standalone) return
        // The rail from 768px up, the tab bar below it.
        const rail = viewport.width >= 768
        await expect(p.getByRole('navigation', { name: 'Main' }).first()).toBeVisible()
        await expect(p.getByRole('button', { name: 'More sections' })).toHaveCount(rail ? 0 : 1)
      })
    }
  })
}
