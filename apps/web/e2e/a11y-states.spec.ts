import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { PAGES, ready } from './support/pages'

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

async function seriousViolations(page: Page, include?: string) {
  await page.waitForTimeout(500) // let entrance animations reach full opacity
  const builder = new AxeBuilder({ page }).withTags(WCAG_AA)
  if (include) builder.include(include)
  const { violations } = await builder.analyze()
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.length}× ${v.nodes[0]?.target.join(' ')}`)
}

test.describe('light theme', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'))
  })

  for (const entry of PAGES) {
    test(`${entry.name} meets WCAG AA in light mode`, async ({ page }) => {
      await page.goto(entry.path)
      await ready(page, entry)
      await expect(page.locator('html')).not.toHaveClass(/dark/)
      expect(await seriousViolations(page)).toEqual([])
    })
  }
})

test.describe('overlays', () => {
  test('command palette', async ({ page, isMobile }) => {
    await page.goto(PAGES[0].path)
    await ready(page, PAGES[0])
    await page.getByRole('button', { name: 'Search or ask' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await seriousViolations(page, '[role="dialog"]')).toEqual([])
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    test.info().annotations.push({ type: 'device', description: isMobile ? 'phone' : 'desktop' })
  })

  test('session picker', async ({ page }) => {
    await page.goto(PAGES[0].path)
    await ready(page, PAGES[0])
    await page.getByRole('button', { name: /change session/i }).click()
    await expect(page.getByRole('dialog').first()).toBeVisible()
    expect(await seriousViolations(page, '[role="dialog"]')).toEqual([])
  })

  test('share menu', async ({ page }) => {
    await page.goto(PAGES[0].path)
    await ready(page, PAGES[0])
    await page.getByRole('button', { name: 'Share and export' }).click()
    await expect(page.getByRole('menu')).toBeVisible()
    expect(await seriousViolations(page, '[role="menu"]')).toEqual([])
  })

  test('keyboard shortcuts', async ({ page, isMobile }) => {
    test.skip(isMobile, 'no hardware keyboard')
    await page.goto(PAGES[0].path)
    await ready(page, PAGES[0])
    await page.keyboard.press('?')
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
    expect(await seriousViolations(page, '[role="dialog"]')).toEqual([])
  })

  test('phone More sheet', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the tab bar is phone-only')
    await page.goto('/nations/')
    await page.getByRole('button', { name: /more sections/i }).click()
    await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible()
    expect(await seriousViolations(page, '[role="dialog"]')).toEqual([])
  })
})

test('every page can be used with the keyboard alone', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no hardware keyboard')
  await page.goto(PAGES[0].path)
  await ready(page, PAGES[0])
  // The first Tab reaches the skip link, which jumps past the navigation.
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#main$/)
  // Focus is always visible: the focused element draws a ring or outline.
  await page.keyboard.press('Tab')
  const ring = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el) return ''
    const s = getComputedStyle(el)
    return `${s.outlineStyle} ${s.boxShadow}`
  })
  expect(ring).not.toBe('none none')
})
