import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { PAGES, ready } from './support/pages'

for (const page of PAGES) {
  test(`${page.name} has no serious accessibility problems`, async ({ page: p }) => {
    // Console errors include Content-Security-Policy violations, so this also proves the
    // served CSP doesn't block anything the page needs.
    const errors: string[] = []
    p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    p.on('pageerror', (e) => errors.push(e.message))
    // Blocked-but-caught actions (an eval probe) don't reach the console; the event does.
    await p.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) =>
        console.error(`CSP blocked ${e.violatedDirective} ${e.blockedURI} in ${e.sourceFile}`),
      )
    })
    await p.goto(page.path)
    await ready(p, page)
    // Let entrance animations settle so contrast is measured at full opacity.
    await p.waitForTimeout(600)
    const { violations } = await new AxeBuilder({ page: p })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    const serious = violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.nodes.length}× ${v.nodes[0]?.target.join(' ')}`)
    expect(serious).toEqual([])
    expect(errors).toEqual([])
  })
}
