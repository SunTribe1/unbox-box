import { expect, test } from '@playwright/test'

const QUALI = '/?s=2025-italian-grand-prix-q'
const RACE = '/?s=2025-italian-grand-prix-r'

test('the session picker switches sessions', async ({ page }) => {
  await page.goto(QUALI)
  await expect(page.getByText('1:18.792').first()).toBeVisible()
  await page.getByRole('button', { name: /change session/i }).click()
  // Keyboard path: search names the session, Enter opens it.
  await page.getByLabel('Search sessions').fill('2025 italian race')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/s=2025-italian-grand-prix-r/)
})

test('? opens the keyboard shortcuts', async ({ page, isMobile }) => {
  test.skip(isMobile, 'no hardware keyboard')
  await page.goto(QUALI)
  await expect(page.getByText('1:18.792').first()).toBeVisible()
  await page.keyboard.press('Shift+Slash')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
  await page.keyboard.press('Escape')
  await page.keyboard.press('3')
  await expect(page).toHaveURL(/\/strategy\//)
})

test('the share menu copies a deep link', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permission is Chromium-only here')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(QUALI)
  await expect(page.getByText('1:18.792').first()).toBeVisible()
  await page.getByRole('button', { name: 'Share and export' }).click()
  await page.getByRole('menuitem', { name: 'Copy link' }).click()
  await expect(page.getByText('Link copied')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    's=2025-italian-grand-prix-q',
  )
})

test('strategy shows race gaps and ranked pit stops', async ({ page }) => {
  await page.goto(`${RACE}&v=strategy`)
  await expect(page.getByText('Race gaps')).toBeVisible()
  await expect(page.getByText(/stops · fastest pit-lane time first/)).toBeVisible()
})

test('phones navigate with the tab bar', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'tab bar is phone-only')
  await page.goto(QUALI)
  await expect(page.getByText('1:18.792').first()).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('button', { name: 'History Explorer' })
    .click()
  await expect(page).toHaveURL(/\/history\//)
})

test('the app is installable', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest.name).toBe('Unbox Box')
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
})

test('the docked Race Engineer hides, stays hidden, and comes back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'phones use the slide-over')
  await page.goto(QUALI)
  const panel = page.getByRole('complementary', { name: 'Race Engineer' })
  await expect(panel).toBeVisible()
  const before = await page.locator('#main').evaluate((el) => el.clientWidth)
  await panel.getByRole('button', { name: 'Hide Race Engineer' }).click()
  await expect(panel).toBeHidden()
  expect(await page.locator('#main').evaluate((el) => el.clientWidth)).toBeGreaterThan(before)
  await page.reload()
  await expect(page.getByText('1:18.792').first()).toBeVisible()
  await expect(panel).toBeHidden()
  await page.getByRole('button', { name: 'Show Race Engineer' }).click()
  await expect(panel).toBeVisible()
})

test('views have their own paths, and Back returns to the previous view', async ({ page }) => {
  await page.goto(`/duel/?s=2025-italian-grand-prix-q&a=LEC-16&b=HAM-16&corner=11`)
  await expect(page.getByRole('combobox', { name: 'Driver A', exact: true })).toContainText('LEC')
  await expect(page).toHaveURL(/\/duel\/\?s=2025-italian-grand-prix-q&a=LEC-16&b=HAM-16&corner=11/)
  await page.goto('/history/?s=2025-italian-grand-prix-q')
  await expect(page.getByRole('tab', { name: /Drivers/ })).toBeVisible()
  await page.getByRole('tab', { name: /Drivers/ }).click()
  await expect(page).toHaveURL(/\/history\/\?s=2025-italian-grand-prix-q&section=drivers/)
})

test('circuit pages open from a link', async ({ page }) => {
  await page.goto('/circuits/?circuit=monza')
  await expect(page.getByRole('heading', { name: 'Monza', exact: true })).toBeVisible()
  await expect(page.getByText('Lap record').first()).toBeVisible()
  await page.getByRole('button', { name: /All circuits/ }).click()
  await expect(page.getByLabel('Search circuits')).toBeVisible()
  await expect(page).toHaveURL(/\/circuits\/\?s=[^&]+$/)
  await page.goBack()
  await expect(page).toHaveURL(/circuit=monza/)
})

test('race archive opens a weekend and every session tab', async ({ page }) => {
  await page.goto('/races/?season=1988')
  await expect(page.getByRole('heading', { name: /1988 season/ })).toBeVisible()
  await page.getByRole('tab', { name: /Calendar/ }).click()
  await page.getByRole('button', { name: /Monaco Grand Prix/ }).click()
  await expect(page).toHaveURL(/\/races\/\?s=[^&]+&season=1988&round=3/)
  await expect(page.getByRole('heading', { name: 'Monaco Grand Prix' })).toBeVisible()
  await page.getByRole('tab', { name: 'Qualifying', exact: true }).click()
  await expect(page).toHaveURL(/session=qualifying/)
  await expect(page.getByRole('cell', { name: '1:23.998' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: /1988 season/ })).toBeVisible()
})

test('record book, engines and nations link to each other', async ({ page }) => {
  await page.goto('/records/?scope=teams&era=1990s')
  await expect(page.getByRole('heading', { name: 'Wins', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Williams/ }).first()).toBeVisible()
  await page.goto('/engines/?maker=honda')
  await expect(page.getByRole('heading', { name: 'Honda', exact: true })).toBeVisible()
  await expect(page.getByText('Constructors’ titles powered')).toBeVisible()
  await page.goto('/nations/?nation=nl')
  await expect(page.getByRole('heading', { name: 'Netherlands', exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: /Max Verstappen/ })
    .first()
    .click()
  await expect(page).toHaveURL(/\/history\/\?s=[^&]+&section=drivers&driver=max-verstappen/)
  await expect(page.getByText(/Family in F1/)).toBeVisible()
})

test('help explains every section and the report form validates', async ({ page }) => {
  await page.goto('/help/')
  await expect(page.getByRole('heading', { name: 'Colours and marks' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Race Archive' })).toBeVisible()
  await page.getByLabel('Title').fill('Hi')
  await page.getByRole('button', { name: /Copy report/ }).click()
  await expect(page.getByText(/short title/)).toBeVisible()
  await page.getByLabel('Title').fill('Replay stutters at 64x')
  await page
    .getByLabel(/What happened/)
    .fill('Pressed play at 64x on Monza 2025 and the cars jump.')
  await page.getByRole('button', { name: /Copy report/ }).click()
  await expect(page.getByText(/short title/)).toBeHidden()
})

test('old History seasons links open the Race Archive championship', async ({ page }) => {
  await page.goto('/history/?section=seasons&season=2021')
  await expect(page).toHaveURL(/\/races\/\?s=[^&]+&season=2021/)
  await expect(page.getByRole('tab', { name: /Championship/ })).toHaveAttribute(
    'data-state',
    'active',
  )
})

test('the developer guide documents the stack, WebMCP and every tool', async ({ page }) => {
  await page.goto('/help/')
  await page.getByRole('radio', { name: /For developers/ }).click()
  await expect(page).toHaveURL(/#dev-architecture$/)
  await expect(page.getByRole('heading', { name: /WebMCP/ })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'compare_laps', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Tool reference' })).toBeVisible()
})

test('a report sends and confirms (form service mocked)', async ({ page }) => {
  let sent: string | null = null
  await page.route('https://api.web3forms.com/submit', async (route) => {
    sent = route.request().postData()
    await route.fulfill({ json: { success: true, message: 'ok' } })
  })
  await page.goto('/help/#feedback')
  await expect(page.getByLabel('Title')).toBeVisible()
  const send = page.getByRole('button', { name: /Send report/ })
  test.skip(!(await send.isVisible()), 'built without NEXT_PUBLIC_WEB3FORMS_KEY')
  await page.getByLabel('Title').fill('Replay stutters at 64x')
  await page
    .getByLabel(/What happened/)
    .fill('Pressed play at 64x on Monza 2025 and the cars jump.')
  await send.click()
  await expect(page.getByText('Thanks, your report is in.')).toBeVisible()
  expect(sent).toContain('Replay stutters at 64x')
})
