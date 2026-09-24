import { ArrowLeftIcon } from 'lucide-react'
import type * as React from 'react'
import { Button } from '@/components/ui/button'

/** "← All circuits": returns from a detail page to its index. */
export function BackButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button variant="ghost" size="sm" className="w-fit" onClick={onClick}>
      <ArrowLeftIcon /> {children}
    </Button>
  )
}
