'use client'

import { CheckIcon, CopyIcon, SendIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  githubIssueUrl,
  REPORT_KINDS,
  reportText,
  sendReport,
  validateReport,
  type Report,
  type ReportErrors,
  type ReportKind,
} from '@/lib/feedback'
import { REPO_URL } from '@/lib/site'
import { useApp } from '@/lib/store'
import { NAV } from '../shell/nav'

const KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY
const REPO = REPO_URL
const COOLDOWN_KEY = 'unboxbox:feedback-sent'
const COOLDOWN_MS = 60_000

function technicalDetails(): string {
  const { sessionId } = useApp.getState()
  return [
    `Link: ${window.location.origin}${window.location.pathname}`,
    `Session: ${sessionId ?? 'none'}`,
    `Screen: ${window.innerWidth}×${window.innerHeight}`,
    `Theme: ${document.documentElement.classList.contains('dark') ? 'dark' : 'light'}`,
    `Browser: ${navigator.userAgent.slice(0, 160)}`,
  ].join('\n')
}

/** One report a minute from this browser (the form service rate-limits too). */
const cooldown = {
  active(): boolean {
    try {
      return Date.now() - Number(localStorage.getItem(COOLDOWN_KEY) ?? 0) < COOLDOWN_MS
    } catch {
      return false
    }
  },
  start(): void {
    try {
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
    } catch {
      // Storage blocked: no local cooldown.
    }
  },
}

/** Form state, validation and the three ways out: send, open an issue, copy. */
function useReportForm() {
  const lastView = useApp((s) => s.lastView)
  const [draft, setDraft] = useState({
    kind: 'bug' as ReportKind,
    page: NAV.find((n) => n.view === lastView)?.label ?? 'General',
    title: '',
    details: '',
    email: '',
  })
  const [includeTech, setIncludeTech] = useState(true)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<ReportErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))
  const tech = () => (includeTech ? technicalDetails() : '')
  const checked = (): Report | null => {
    const result = validateReport(draft)
    setErrors(result.ok ? {} : result.errors)
    return result.ok ? result.report : null
  }

  const send = async () => {
    const report = checked()
    if (!report || !KEY || honeypot) return
    if (cooldown.active()) {
      toast.error('One moment', { description: 'You just sent a report. Try again in a minute.' })
      return
    }
    setStatus('sending')
    try {
      await sendReport(KEY, report, tech())
      cooldown.start()
      setStatus('sent')
    } catch (error) {
      setStatus('idle')
      toast.error('Couldn’t send the report', {
        description: `${error instanceof Error ? error.message : ''} Copy it instead; nothing was lost.`,
      })
    }
  }

  const openIssue = () => {
    const report = checked()
    const url = report && githubIssueUrl(REPO, report, tech())
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const copy = async () => {
    const report = checked()
    if (!report) return
    try {
      await navigator.clipboard.writeText(reportText(report, tech()))
      toast.success('Report copied', { description: 'Paste it wherever you like.' })
    } catch {
      toast.error('Couldn’t copy', { description: 'Your browser blocked the clipboard.' })
    }
  }

  const reset = () => {
    setDraft((d) => ({ ...d, title: '', details: '' }))
    setStatus('idle')
  }

  return {
    draft,
    set,
    includeTech,
    setIncludeTech,
    honeypot,
    setHoneypot,
    errors,
    status,
    send,
    openIssue,
    copy,
    reset,
  }
}

function Sent({ onAgain }: { onAgain: () => void }) {
  return (
    <div className="grid justify-items-start gap-3 rounded-xl bg-surface-2/60 p-5" role="status">
      <span className="flex items-center gap-2 font-medium">
        <CheckIcon className="size-4 text-success" aria-hidden /> Thanks, your report is in.
      </span>
      <p className="text-sm text-muted-foreground">
        If you left an email, we can reply when we look at it.
      </p>
      <Button variant="outline" size="sm" onClick={onAgain}>
        Send another
      </Button>
    </div>
  )
}

/** A repo link that can take issues (checked once; the env value is fixed at build). */
const HAS_ISSUES = !!githubIssueUrl(REPO, {
  kind: 'bug',
  page: 'General',
  title: 'check',
  details: 'check',
  email: '',
})

/** The report form on the Help page. */
export function FeedbackForm() {
  const f = useReportForm()
  const { draft, errors } = f
  if (f.status === 'sent') return <Sent onAgain={f.reset} />

  return (
    <form
      className="grid gap-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (KEY) void f.send()
        else if (HAS_ISSUES) f.openIssue()
        else void f.copy()
      }}
    >
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel id="report-kind">What is it?</FieldLabel>
          <ToggleGroup
            type="single"
            value={draft.kind}
            onValueChange={(v) => v && f.set('kind', v as ReportKind)}
            aria-labelledby="report-kind"
            className="flex-wrap justify-start"
          >
            {REPORT_KINDS.map((k) => (
              <ToggleGroupItem key={k.value} value={k.value}>
                {k.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <div className="grid gap-4 @min-[640px]:grid-cols-[14rem_1fr]">
          <Field>
            <FieldLabel htmlFor="report-page">Where</FieldLabel>
            <Select value={draft.page} onValueChange={(v) => f.set('page', v)}>
              <SelectTrigger id="report-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">General</SelectItem>
                {NAV.filter((n) => n.view !== 'help').map((n) => (
                  <SelectItem key={n.view} value={n.label}>
                    {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="report-title">Title</FieldLabel>
            <Input
              id="report-title"
              value={draft.title}
              maxLength={120}
              onChange={(e) => f.set('title', e.target.value)}
              placeholder={
                draft.kind === 'bug' ? 'Replay freezes at lap 30' : 'Show tyre age in the tower'
              }
              aria-invalid={!!errors.title}
            />
            {errors.title && <FieldError>{errors.title}</FieldError>}
          </Field>
        </div>
        <Field data-invalid={!!errors.details}>
          <FieldLabel htmlFor="report-details">
            {draft.kind === 'bug' ? 'What happened, and what did you expect?' : 'Tell us more'}
          </FieldLabel>
          <Textarea
            id="report-details"
            value={draft.details}
            maxLength={4000}
            rows={6}
            onChange={(e) => f.set('details', e.target.value)}
            placeholder={
              draft.kind === 'bug'
                ? 'Steps: opened the 2025 Monza race, pressed play at 16x...\nExpected: ...\nWhat happened: ...'
                : 'What would you use it for?'
            }
            aria-invalid={!!errors.details}
          />
          {errors.details && <FieldError>{errors.details}</FieldError>}
        </Field>
        {KEY && (
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="report-email">Email (optional)</FieldLabel>
            <Input
              id="report-email"
              type="email"
              value={draft.email}
              maxLength={200}
              onChange={(e) => f.set('email', e.target.value)}
              placeholder="Only if you'd like a reply"
              aria-invalid={!!errors.email}
            />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </Field>
        )}
        <Field orientation="horizontal">
          <Checkbox
            id="report-tech"
            checked={f.includeTech}
            onCheckedChange={(v) => f.setIncludeTech(v === true)}
          />
          <div className="grid gap-1">
            <FieldLabel htmlFor="report-tech">Include technical details</FieldLabel>
            <FieldDescription>
              The page link, session, screen size, theme and browser. Nothing else.
            </FieldDescription>
          </div>
        </Field>
        {/* Hidden from people; bots fill it in. */}
        <input
          type="text"
          name="botcheck"
          tabIndex={-1}
          autoComplete="off"
          value={f.honeypot}
          onChange={(e) => f.setHoneypot(e.target.value)}
          className="hidden"
          aria-hidden
        />
      </FieldGroup>

      <div className="flex flex-wrap items-center gap-2">
        {KEY && (
          <Button type="submit" disabled={f.status === 'sending'}>
            <SendIcon /> {f.status === 'sending' ? 'Sending…' : 'Send report'}
          </Button>
        )}
        {HAS_ISSUES && (
          <Button
            type={KEY ? 'button' : 'submit'}
            variant={KEY ? 'outline' : 'default'}
            onClick={KEY ? f.openIssue : undefined}
          >
            Open a GitHub issue
          </Button>
        )}
        <Button
          type={KEY || HAS_ISSUES ? 'button' : 'submit'}
          variant={KEY || HAS_ISSUES ? 'ghost' : 'default'}
          onClick={KEY || HAS_ISSUES ? f.copy : undefined}
        >
          <CopyIcon /> Copy report
        </Button>
      </div>
      {!KEY && !HAS_ISSUES && (
        <p className="text-caption text-muted-foreground">
          Sending isn&apos;t set up on this copy of Unbox Box, so copy the report and send it to
          whoever shared the app with you.
        </p>
      )}
    </form>
  )
}
