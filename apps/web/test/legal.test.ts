import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DISCLAIMER, DISCLAIMER_SHORT, F1_MARKS, NAMED_MARKS } from '../src/lib/legal'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
/** Markdown and JSX wrap lines; compare text with whitespace collapsed. */
const flat = (text: string) => text.replace(/\s+/g, ' ')

describe('legal notices', () => {
  it('say the app is unofficial and credit the F1 marks', () => {
    expect(DISCLAIMER_SHORT).toContain('unofficial')
    expect(DISCLAIMER_SHORT).toContain(F1_MARKS)
    expect(NAMED_MARKS).toContain('Ferrari')
  })

  it('never claim fair use or affiliate income, which do not apply', () => {
    const all = flat(DISCLAIMER.flatMap((s) => s.paragraphs).join(' '))
    expect(all).not.toMatch(/fair use/i)
    expect(all).toContain('no advertising, sponsorship or affiliate links')
  })

  it('are copied word for word into the README and the data licence', () => {
    const readme = flat(read('../../../README.md'))
    for (const p of DISCLAIMER.flatMap((s) => s.paragraphs)) expect(readme).toContain(flat(p))
    expect(flat(read('../public/data/DATA_LICENSE.md'))).toContain(flat(DISCLAIMER_SHORT))
  })
})
