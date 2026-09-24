import { expect, test } from '@playwright/test'

test('a page that has loaded once opens again offline', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'service worker offline is checked in Chromium')
  await page.goto('/duel/?s=2025-italian-grand-prix-q')
  await expect(page.getByText('1:18.792').first()).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready)
  // A second load lets the worker cache what the first one fetched before it took control.
  await page.reload()
  await expect(page.getByText('1:18.792').first()).toBeVisible()
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('1:18.792').first()).toBeVisible()
  await context.setOffline(false)
})
