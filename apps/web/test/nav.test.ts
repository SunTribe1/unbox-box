import { VIEWS } from '@unbox-box/tools'
import { describe, expect, it } from 'vitest'
import { GUIDES } from '../src/features/help/help-content'
import { NAV, PRIMARY_VIEWS } from '../src/features/shell/nav'
import { VIEW_SLUG } from '../src/lib/routes'
import { VIEW_META } from '../src/lib/view-meta'

describe('navigation', () => {
  it('lists every view exactly once', () => {
    expect(NAV.map((n) => n.view).sort()).toEqual([...VIEWS].sort())
  })

  it('gives every view its own path', () => {
    const slugs = Object.values(VIEW_SLUG)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z]+$/)
  })

  it('keeps the phone tab bar to four views plus More', () => {
    expect(PRIMARY_VIEWS).toHaveLength(4)
  })

  it('has a Help guide for every section', () => {
    const guided = new Set(GUIDES.map((g) => g.view))
    for (const n of NAV) if (n.view !== 'help') expect(guided.has(n.view), n.view).toBe(true)
  })

  it('titles every page like its navigation label, with a description', () => {
    for (const n of NAV) {
      expect(VIEW_META[n.view].title).toBe(n.label)
      expect(VIEW_META[n.view].description.length).toBeGreaterThan(40)
      expect(VIEW_META[n.view].description.length).toBeLessThanOrEqual(160)
    }
  })
})
