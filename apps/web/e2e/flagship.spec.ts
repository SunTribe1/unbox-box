import { expect, test } from '@playwright/test'

const QUALI = '/?s=2025-italian-grand-prix-q'

test('opens Lap Duel by default, on the latest session', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/duel\//)
  await expect(page.getByRole('combobox', { name: 'Driver A', exact: true })).toBeVisible()
})

test('the replay opens from its own path', async ({ page }) => {
  await page.goto('/replay/')
  await expect(page.getByRole('slider', { name: 'Race time' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Running order' })).toContainText('VER')
})

test('qualifying loads pole vs P2 in Lap Duel', async ({ page }) => {
  await page.goto(QUALI)
  await expect(page.getByText('1:18.792').first()).toBeVisible()
  await expect(page.getByText('1:18.869').first()).toBeVisible()
})

test('the Race Engineer answers the flagship question and drives the UI', async ({
  page,
  isMobile,
}) => {
  await page.goto(QUALI)
  await expect(page.getByText('1:18.792').first()).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Open Race Engineer' }).click()
  const input = page.getByLabel('Ask the Race Engineer').last()
  await input.fill('Where did Piastri lose time to Norris?')
  await input.press('Enter')
  await expect(page.getByText(/Oscar Piastri was 0\.113s slower than Lando Norris/)).toBeVisible()
  await expect(page).toHaveURL(/\/NOR-\d+-vs-PIA-\d+\//)
  await expect(page.getByText('1:18.982').first()).toBeVisible()
})

test('the Race Engineer drives the replay', async ({ page, isMobile }) => {
  await page.goto('/replay/')
  await expect(page.getByRole('slider', { name: 'Race time' })).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Open Race Engineer' }).click()
  const input = page.getByLabel('Ask the Race Engineer').last()
  await input.fill('Who was leading on lap 30?')
  await input.press('Enter')
  await expect(page.getByText(/End of lap 30:/)).toBeVisible()
  await expect(page.getByText(/LAP\s*30\s*\/53/).first()).toBeVisible()
})

test('deep links restore the duel and highlighted corner', async ({ page }) => {
  await page.goto('/?s=2025-italian-grand-prix-q&a=LEC&la=16&b=HAM&lb=16&c=11')
  await expect(page.getByText('1:19.007').first()).toBeVisible()
  await expect(page.getByText(/Curva Alboreto \(T11\)/).first()).toBeVisible()
})

test('credits page lists the data licence', async ({ page }) => {
  await page.goto('/credits/')
  await expect(page.getByRole('heading', { name: 'Credits and licences' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'TracingInsights' })).toBeVisible()
})

test('the Race Engineer runs a strategy what-if', async ({ page, isMobile }) => {
  await page.goto(QUALI)
  await expect(page.getByText('1:18.792').first()).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Open Race Engineer' }).click()
  const input = page.getByLabel('Ask the Race Engineer').last()
  await input.fill('What if Norris pitted on lap 30 for hards?')
  await input.press('Enter')
  await expect(page.getByText(/One stop on lap 30 for hards/)).toBeVisible()
  await expect(page).toHaveURL(/\/strategy\//)
  if (isMobile) await page.getByRole('button', { name: 'Close Race Engineer' }).last().click()
  await expect(page.getByText('Pit stop simulator')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Tyre stints by driver' })).toContainText('VER')
})

test('the Race Engineer answers all-time questions', async ({ page, isMobile }) => {
  await page.goto(QUALI)
  await expect(page.getByText('1:18.792').first()).toBeVisible()
  if (isMobile) await page.getByRole('button', { name: 'Open Race Engineer' }).click()
  const input = page.getByLabel('Ask the Race Engineer').last()
  await input.fill('Senna vs Prost')
  await input.press('Enter')
  await expect(page.getByText(/In 140 races together/)).toBeVisible()
  await expect(page).toHaveURL(/\/history\//)
  if (isMobile) await page.getByRole('button', { name: 'Close Race Engineer' }).last().click()
  await expect(page.getByRole('button', { name: 'Driver A' })).toContainText('Ayrton Senna')
  // Leaderboards open in the Record Book, with the years as the era.
  if (isMobile) await page.getByRole('button', { name: 'Open Race Engineer' }).click()
  await input.fill('most wins in the 90s')
  await input.press('Enter')
  await expect(page).toHaveURL(/\/records\/drivers\/wins\/\?era=1990-1999$/)
  if (isMobile) await page.getByRole('button', { name: 'Close Race Engineer' }).last().click()
  await expect(page.getByRole('list', { name: 'Wins leaderboard' })).toContainText(
    'Michael Schumacher',
  )
})
