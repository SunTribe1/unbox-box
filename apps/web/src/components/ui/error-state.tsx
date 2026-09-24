'use client'

import { AlertTriangleIcon, RotateCwIcon } from 'lucide-react'
import { m } from 'motion/react'
import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { queryClient } from '@/lib/data'
import { enter } from '@/lib/motion'

interface ErrorStateProps {
  title: string
  error: Error
}

/** A failed load (shadcn Alert) with a retry that refetches whatever failed. */
export function ErrorState({ title, error }: ErrorStateProps) {
  const [retrying, setRetrying] = useState(false)
  const retry = async () => {
    setRetrying(true)
    try {
      await queryClient.refetchQueries({ predicate: (q) => q.state.status === 'error' })
    } finally {
      setRetrying(false)
    }
  }
  return (
    <m.div {...enter}>
      <Alert className="border-danger/35 bg-card shadow-card">
        <AlertTriangleIcon className="text-danger" aria-hidden />
        <AlertTitle className="text-title">{title}</AlertTitle>
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span className="break-words">{error.message}</span>
          <Button variant="outline" size="sm" onClick={retry} disabled={retrying}>
            {retrying ? <Spinner /> : <RotateCwIcon aria-hidden />}
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </m.div>
  )
}
