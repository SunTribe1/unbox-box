// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BackButton } from '@/components/back-button'
import { Flag } from '@/components/flag'
import { HelpText } from '@/components/help-text'
import { MiniStats } from '@/components/mini-stats'
import { PageHeader } from '@/components/page-header'
import { TileButton } from '@/components/tile-button'
import { Logo, Wordmark } from '@/features/shell/logo'

describe('shared components', () => {
  it('Flag renders a lazy, decorative image for a valid code only', () => {
    const { container, rerender } = render(<Flag code="NL" />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', '/flags/nl.svg')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('loading', 'lazy')
    rerender(<Flag code="nope" />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('PageHeader shows a level-2 heading, description and actions', () => {
    render(
      <PageHeader
        icon={() => <svg />}
        title="Record Book"
        description="Every Grand Prix"
        actions={<button type="button">Era</button>}
      />,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Record Book' })).toBeInTheDocument()
    expect(screen.getByText('Every Grand Prix')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Era' })).toBeInTheDocument()
  })

  it('TileButton and BackButton are buttons that call back on click', async () => {
    const open = vi.fn()
    const back = vi.fn()
    render(
      <>
        <TileButton onClick={open}>Monza</TileButton>
        <BackButton onClick={back}>All circuits</BackButton>
      </>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Monza' }))
    await userEvent.click(screen.getByRole('button', { name: /All circuits/ }))
    expect(open).toHaveBeenCalledOnce()
    expect(back).toHaveBeenCalledOnce()
  })

  it('MiniStats pairs every label with its value', () => {
    render(
      <MiniStats
        items={[
          ['Wins', 91],
          ['Poles', 68],
        ]}
      />,
    )
    expect(screen.getByText('Wins').nextSibling).toHaveTextContent('91')
    expect(screen.getByText('Poles').nextSibling).toHaveTextContent('68')
  })

  it('HelpText hides its icon from assistive tech', () => {
    const { container } = render(<HelpText>Data from F1DB</HelpText>)
    expect(screen.getByText('Data from F1DB')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('the wordmark is labelled; the mark is decorative', () => {
    const { container } = render(
      <>
        <Wordmark />
        <Logo />
      </>,
    )
    expect(screen.getByRole('img', { name: 'Unbox Box' })).toBeInTheDocument()
    expect(container.querySelectorAll('svg[aria-hidden]')).toHaveLength(1)
  })
})
