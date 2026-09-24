'use client'

import { DownloadIcon, KeyboardIcon, LinkIcon, Share2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportCurrentView } from '@/lib/view-export'

function openShortcuts() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(location.href)
    toast.success('Link copied', { description: 'It opens exactly this view.' })
  } catch {
    toast.error('Couldn’t copy the link', { description: 'Copy it from the address bar.' })
  }
}

async function shareLink() {
  try {
    await navigator.share({ title: document.title, url: location.href })
  } catch (error) {
    if ((error as DOMException).name !== 'AbortError') void copyLink()
  }
}

async function downloadCsv() {
  const id = toast.loading('Preparing CSV…')
  try {
    const what = await exportCurrentView()
    toast.success(`${what} downloaded`, { id })
  } catch (error) {
    toast.error('Export failed', { id, description: (error as Error).message })
  }
}

/** Share and export: every state is a URL, so sharing is copying it. */
export function ShareMenu() {
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Share and export">
          <Share2Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 shadow-pop">
        <DropdownMenuLabel className="text-label text-faint-foreground">
          This view
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void copyLink()}>
          <LinkIcon /> Copy link
        </DropdownMenuItem>
        {canShare && (
          <DropdownMenuItem onSelect={() => void shareLink()}>
            <Share2Icon /> Share…
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void downloadCsv()}>
          <DownloadIcon /> Download CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={openShortcuts}>
          <KeyboardIcon /> Keyboard shortcuts
          <DropdownMenuShortcut>?</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
