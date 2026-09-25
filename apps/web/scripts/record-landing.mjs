// Records the landing page's screen clips and posters, and the README screenshots, from a
// running build of the app:
//   npm run build && npx serve out -l 3100      (with NEXT_PUBLIC_DATA_BASE for the full data)
//   npm run landing:media                       (LANDING_BASE overrides the address)
// Each clip starts after its page has loaded, so there is no blank first frame.
import { chromium } from '@playwright/test'

const OUT = new URL('../public/landing/', import.meta.url).pathname
const DOCS = new URL('../../../docs/screenshots/', import.meta.url).pathname
const B = process.env.LANDING_BASE ?? 'http://localhost:3100'
const b = await chromium.launch()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function clip(name, path, { docked = false, act }) {
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })
  await c.addInitScript((d) => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('unboxbox:engineer-docked', d ? '1' : '0')
  }, docked)
  const p = await c.newPage()
  await p.goto(B + path, { waitUntil: 'networkidle' })
  await sleep(2500)
  await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 })
  await p.screencast.start({
    path: `${OUT}/${name}.webm`,
    size: { width: 1280, height: 800 },
    quality: 75,
  })
  await act(p)
  await p.screencast.stop()
  await c.close()
  console.log('recorded', name)
}

await clip('lap-duel', '/duel/2025-italian-grand-prix-q/LEC-16-vs-HAM-16/', {
  act: async (p) => {
    const box = await p.locator('.u-over').first().boundingBox()
    const y = box ? box.y + box.height / 2 : 650
    const x0 = box ? box.x + 10 : 140,
      x1 = box ? box.x + box.width - 10 : 1380
    for (let i = 0; i <= 90; i++) {
      await p.mouse.move(x0 + ((x1 - x0) * i) / 90, y)
      await sleep(60)
    }
    await sleep(600)
  },
})
await clip('race-replay', '/replay/2025-italian-grand-prix-r/?at=900', {
  act: async (p) => {
    await p.getByRole('button', { name: /^Play/ }).first().click()
    await sleep(7500)
  },
})
await clip('strategy', '/strategy/2025-italian-grand-prix-r/', {
  act: async (p) => {
    await p.mouse.move(700, 500)
    for (let i = 0; i < 40; i++) {
      await p.mouse.wheel(0, 28)
      await sleep(80)
    }
    await sleep(1200)
    for (let i = 0; i < 40; i++) {
      await p.mouse.wheel(0, -28)
      await sleep(60)
    }
    await sleep(800)
  },
})
await clip('race-archive', '/races/2025/', {
  act: async (p) => {
    await sleep(800)
    await p.getByRole('tab', { name: /Calendar/ }).click()
    await sleep(1400)
    await p
      .getByRole('button', { name: /Italian Grand Prix/ })
      .first()
      .click()
    await sleep(1800)
    await p.getByRole('tab', { name: 'Qualifying', exact: true }).click()
    await sleep(2000)
  },
})
await clip('race-engineer', '/duel/2025-italian-grand-prix-q/', {
  docked: true,
  act: async (p) => {
    const input = p.getByLabel('Ask the Race Engineer').last()
    await input.click()
    await sleep(300)
    await input.pressSequentially('Where did Piastri lose time to Norris?', { delay: 55 })
    await sleep(400)
    await input.press('Enter')
    await sleep(4500)
  },
})
// README screenshots: the app in dark mode with the Race Engineer panel closed.
async function still(name, path, options = {}) {
  const c = await b.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    ...options,
  })
  await c.addInitScript(() => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('unboxbox:engineer-docked', '0')
  })
  const p = await c.newPage()
  await p.goto(B + path, { waitUntil: 'networkidle' })
  await sleep(3000)
  await p.screenshot({ path: `${DOCS}/${name}.png` })
  await c.close()
  console.log('screenshot', name)
}
await still('lap-duel', '/duel/2025-italian-grand-prix-q/LEC-16-vs-HAM-16/')
await still('race-replay', '/replay/2025-italian-grand-prix-r/?at=2400')
await still('strategy', '/strategy/2025-italian-grand-prix-r/')
await still('race-archive', '/races/1988/6/')
await still('record-book', '/records/')
await still('circuits', '/circuits/')
await still('phone', '/duel/2025-italian-grand-prix-q/', {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})

await b.close()
