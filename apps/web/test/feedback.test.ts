import { describe, expect, it, vi } from 'vitest'
import {
  githubIssueUrl,
  reportText,
  sendReport,
  validateReport,
  web3formsPayload,
  WEB3FORMS_ENDPOINT,
  type Report,
} from '../src/lib/feedback'

const report: Report = {
  kind: 'bug',
  page: 'Race Replay',
  title: 'Replay stutters at 64x',
  details: 'Cars jump between positions on Monza 2025.',
  email: '',
}

describe('validateReport', () => {
  it('accepts a complete report and trims it', () => {
    const r = validateReport({ ...report, title: '  Replay stutters  ' })
    expect(r).toEqual({ ok: true, report: { ...report, title: 'Replay stutters' } })
  })

  it('names each field that needs fixing', () => {
    const r = validateReport({ ...report, title: 'Hi', details: 'short', email: 'not-an-email' })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(Object.keys(r.errors).sort()).toEqual(['details', 'email', 'title'])
    expect(r.errors.title).toMatch(/short title/)
  })

  it('rejects unknown kinds and oversized text', () => {
    expect(validateReport({ ...report, kind: 'spam' }).ok).toBe(false)
    expect(validateReport({ ...report, details: 'x'.repeat(4001) }).ok).toBe(false)
  })
})

describe('report output', () => {
  it('reads as plain text with optional technical details', () => {
    expect(reportText(report)).toBe(
      '[Bug] Replay stutters at 64x\n\nPage: Race Replay\n\nCars jump between positions on Monza 2025.',
    )
    expect(reportText(report, 'Screen: 390×844')).toMatch(/---\nScreen: 390×844$/)
  })

  it('builds the Web3Forms payload with a reply-to only when given', () => {
    const plain = web3formsPayload('key-1', report)
    expect(plain).toMatchObject({ access_key: 'key-1', botcheck: false, message: report.details })
    expect(plain).not.toHaveProperty('email')
    const withEmail = web3formsPayload('key-1', { ...report, email: 'a@b.co' })
    expect(withEmail).toMatchObject({ email: 'a@b.co', replyto: 'a@b.co' })
  })

  it('makes a GitHub issue link only for GitHub repos', () => {
    const url = githubIssueUrl('https://github.com/me/unbox-box', report)!
    const q = new URL(url).searchParams
    expect(url.startsWith('https://github.com/me/unbox-box/issues/new?')).toBe(true)
    expect(q.get('labels')).toBe('bug')
    expect(q.get('title')).toBe(report.title)
    expect(githubIssueUrl('https://gitlab.com/me/x', report)).toBeNull()
    expect(githubIssueUrl(undefined, report)).toBeNull()
  })
})

describe('sendReport', () => {
  const reply = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status }))

  it('posts form fields to Web3Forms, without a preflight-triggering content type', async () => {
    const fetcher = vi.fn(() => reply(200, { success: true }))
    await sendReport('key-1', report, 'Screen: 390×844', fetcher as unknown as typeof fetch)
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(WEB3FORMS_ENDPOINT)
    const body = init.body as FormData
    expect(body.get('access_key')).toBe('key-1')
    expect(body.get('message')).toBe(report.details)
    expect(body.get('technical')).toBe('Screen: 390×844')
    expect(body.has('botcheck')).toBe(false)
    expect(init.headers).not.toHaveProperty('Content-Type')
  })

  it('surfaces the service message when it refuses', async () => {
    const fetcher = () => reply(200, { success: false, message: 'Invalid access key' })
    await expect(sendReport('bad', report, '', fetcher as typeof fetch)).rejects.toThrow(
      'Invalid access key',
    )
    const down = () => reply(500, {})
    await expect(sendReport('k', report, '', down as typeof fetch)).rejects.toThrow(/500/)
  })
})
