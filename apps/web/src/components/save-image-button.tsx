'use client'

import { ImageDownIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Hint } from '@/components/ui/hint'
import { Spinner } from '@/components/ui/spinner'

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Saves the card this button sits in as a PNG, in the current theme, at 2x. The button
 *  itself and other controls marked `data-export-hide` are left out of the image. */
export function SaveImageButton({ name }: { name: string }) {
  const [busy, setBusy] = useState(false)
  const save = async (button: HTMLElement) => {
    const card = button.closest<HTMLElement>('[data-slot=card]')
    if (!card) return
    setBusy(true)
    try {
      const { toPng } = await import('html-to-image')
      const background = getComputedStyle(card).backgroundColor
      const url = await toPng(card, {
        pixelRatio: 2,
        backgroundColor: background,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.exportHide != null),
      })
      const link = document.createElement('a')
      link.href = url
      link.download = `unbox-box-${slug(name)}.png`
      link.click()
    } catch (error) {
      toast.error('Could not save the image', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Hint label="Save as image">
      <Button
        variant="ghost"
        size="icon-sm"
        data-export-hide=""
        aria-label={`Save ${name} as an image`}
        disabled={busy}
        onClick={(e) => void save(e.currentTarget)}
      >
        {busy ? <Spinner /> : <ImageDownIcon />}
      </Button>
    </Hint>
  )
}
