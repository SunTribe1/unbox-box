// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

/** The form reads its settings at import, so each test loads it fresh with its own env. */
async function renderForm(env: Record<string, string> = {}) {
  vi.resetModules()
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  const { FeedbackForm } = await import('@/features/help/feedback-form')
  render(<FeedbackForm />)
}

/** Pastes rather than types: jsdom re-renders the whole form (Radix and all) on every key,
 *  about 60 ms each, so typing a sentence alone outran the 5 s test timeout. */
async function fill() {
  const user = userEvent.setup()
  await user.click(screen.getByLabelText('Title'))
  await user.paste('Replay stutters at 64x')
  await user.click(screen.getByLabelText(/What happened/))
  await user.paste('Pressed play at 64x on Monza 2025 and the cars jump.')
}

describe('FeedbackForm', () => {
  // Compile the form and its UI kit once, so the first test is not timed on a cold import.
  beforeAll(() => import('@/features/help/feedback-form'), 30_000)

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('explains what is wrong instead of sending an incomplete report', async () => {
    await renderForm({ NEXT_PUBLIC_WEB3FORMS_KEY: 'k' })
    await userEvent.click(screen.getByRole('button', { name: /Send report/ }))
    expect(await screen.findByText(/short title/)).toBeInTheDocument()
    expect(screen.getByText(/little more/)).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
  })

  it('sends a valid report and confirms it', async () => {
    const fetcher = vi.fn(async () => Response.json({ success: true }))
    vi.stubGlobal('fetch', fetcher)
    await renderForm({ NEXT_PUBLIC_WEB3FORMS_KEY: 'k' })
    await fill()
    await userEvent.click(screen.getByRole('button', { name: /Send report/ }))
    expect(await screen.findByRole('status')).toHaveTextContent('Thanks, your report is in.')
    const body = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData
    expect(body.get('title')).toBe('Replay stutters at 64x')
  })

  it('never sends when the hidden bot field is filled', async () => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await renderForm({ NEXT_PUBLIC_WEB3FORMS_KEY: 'k' })
    await fill()
    const trap = document.querySelector<HTMLInputElement>('input[name="botcheck"]')!
    await userEvent.type(trap, 'spam', { skipClick: true })
    await userEvent.click(screen.getByRole('button', { name: /Send report/ }))
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('falls back to copying the report when sending is not set up', async () => {
    await renderForm({ NEXT_PUBLIC_WEB3FORMS_KEY: '', NEXT_PUBLIC_REPO_URL: '' })
    expect(screen.queryByRole('button', { name: /Send report/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Copy report/ })).toHaveAttribute('type', 'submit')
  })
})
