import type * as React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** A shadcn Tooltip around a single element: the styled, keyboard-friendly replacement for
 *  the native `title` attribute. */
export function Hint({
  label,
  children,
}: {
  label: React.ReactNode
  children: React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
