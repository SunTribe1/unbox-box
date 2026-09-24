'use client'

import { suggestionsFor, tools } from '@unbox-box/tools'
import { ArrowUpIcon, CheckIcon, PanelRightCloseIcon, XIcon } from 'lucide-react'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { EngineerIcon } from '@/components/icons'
import { AnimatePresence, m } from 'motion/react'
import { useEffect, useId, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import { Kbd } from '@/components/ui/kbd'
import { Marker, MarkerContent } from '@/components/ui/marker'
import { Message as ChatMessage, MessageContent } from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApp, type CallEntry, type Message } from '@/lib/store'
import { enter, riseIn, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useSessionMeta } from '../lap-duel/use-duel'
import { ask } from './ask-lazy'

const lineStagger = stagger(0.05)

function formatArgs(input: Record<string, unknown>): string[] {
  return Object.entries(input).map(
    ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(',') : String(v)}`,
  )
}

function StatusIcon({ status }: { status: CallEntry['status'] }) {
  if (status === 'done') return <CheckIcon className="size-3.5 text-success" aria-label="done" />
  if (status === 'error') return <XIcon className="size-3.5 text-danger" aria-label="failed" />
  if (status === 'running')
    return <Spinner className="size-3.5 text-signal-ink" aria-label="running" />
  return <span className="size-2 rounded-full bg-faint-foreground/50" aria-label="queued" />
}

function CallRow({ call }: { call: CallEntry }) {
  return (
    <m.div {...enter} layout="position" role="listitem">
      <Item size="sm" className="items-start gap-2.5 rounded-none px-3 py-2">
        <ItemMedia className="mt-0.5 size-4">
          <StatusIcon status={call.status} />
        </ItemMedia>
        <ItemContent className="min-w-0 gap-1">
          <ItemTitle className="flex flex-wrap items-center gap-1">
            <code className="font-mono text-xs text-foreground">{call.tool}</code>
            {formatArgs(call.input).map((arg) => (
              <Badge key={arg} variant="mono">
                {arg}
              </Badge>
            ))}
          </ItemTitle>
          {call.effect && <ItemDescription className="text-xs">→ {call.effect}</ItemDescription>}
          {call.error && (
            <ItemDescription className="text-xs text-danger">{call.error}</ItemDescription>
          )}
        </ItemContent>
      </Item>
    </m.div>
  )
}

function Suggestions({ items, onPick }: { items: string[]; onPick(text: string): void }) {
  return (
    <m.div
      className="flex flex-wrap gap-1.5"
      variants={stagger(0.035, 0.1)}
      initial="hidden"
      animate="show"
    >
      {items.map((s) => (
        <m.div key={s} variants={riseIn}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPick(s)}
            className="h-auto rounded-full bg-surface-1 px-3 py-1.5 text-left text-xs font-normal whitespace-normal text-muted-foreground hover:border-signal/50 hover:text-foreground dark:bg-surface-1"
          >
            {s}
          </Button>
        </m.div>
      ))}
    </m.div>
  )
}

/** The answer arrives a line at a time, like a radio read-out. */
function AnswerText({ text, error }: { text: string; error: boolean }) {
  const lines = text.split('\n')
  return (
    <m.div
      variants={lineStagger}
      initial="hidden"
      animate="show"
      className={cn('text-sm leading-relaxed', error && 'text-danger')}
    >
      {lines.map((line, i) =>
        line ? (
          <m.p key={i} variants={riseIn}>
            {line}
          </m.p>
        ) : (
          <div key={i} className="h-3" aria-hidden />
        ),
      )}
    </m.div>
  )
}

function MessageView({ message, onPick }: { message: Message; onPick(text: string): void }) {
  if (message.role === 'user') {
    return (
      <m.div {...enter}>
        <ChatMessage align="end">
          <MessageContent>
            <Bubble variant="secondary" align="end" className="ml-8 max-w-full">
              <BubbleContent className="rounded-2xl rounded-br-md px-3.5">
                {message.text}
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </ChatMessage>
      </m.div>
    )
  }
  return (
    <m.div {...enter}>
      <ChatMessage>
        <MessageContent className="gap-2">
          {message.source === 'webmcp' && (
            <Marker className="text-label">
              <MarkerContent>Browser agent via WebMCP</MarkerContent>
            </Marker>
          )}
          {message.calls.length > 0 && (
            <ItemGroup
              className="divide-y overflow-hidden rounded-lg border bg-surface-1"
              aria-live="polite"
            >
              <AnimatePresence initial={false}>
                {message.calls.map((call, i) => (
                  <CallRow key={`${call.tool}-${i}`} call={call} />
                ))}
              </AnimatePresence>
            </ItemGroup>
          )}
          {message.text && <AnswerText text={message.text} error={message.status === 'error'} />}
          {message.suggestions && <Suggestions items={message.suggestions} onPick={onPick} />}
        </MessageContent>
      </ChatMessage>
    </m.div>
  )
}

export function AgentPanel({
  className,
  webmcp,
  onClose,
  onCollapse,
}: {
  className?: string
  webmcp: boolean
  /** Slide-over mode: closes the sheet. */
  onClose?: () => void
  /** Docked mode: collapses the panel so the main area gets the full width. */
  onCollapse?: () => void
}) {
  const messages = useApp((s) => s.messages)
  const busy = useApp((s) => s.busy)
  const ready = useApp((s) => s.duel !== null)
  const view = useApp((s) => s.view)
  const meta = useSessionMeta().data
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = (text: string) => {
    if (!ready) return
    void ask(text)
    setDraft('')
  }

  return (
    <aside
      aria-label="Race Engineer"
      className={cn('relative flex h-full min-h-0 flex-col bg-surface-1', className)}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[linear-gradient(90deg,transparent,var(--signal),transparent)] bg-[length:200%_100%] opacity-0 transition-opacity',
          busy && 'animate-shimmer opacity-100',
        )}
      />
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-foreground">
            <EngineerIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold whitespace-nowrap">Race Engineer</h2>
            <p className="text-xs whitespace-nowrap text-muted-foreground">
              Ask about this session
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Status stacked in a column, so the title never wraps next to it. */}
          <div className="flex flex-col items-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" tabIndex={0}>
                  <span className="size-1.5 rounded-full bg-success" /> Engine
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Green: the built-in command engine is ready. It answers instantly and offline, with
                no AI key.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" tabIndex={0}>
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      webmcp ? 'animate-pulse bg-success' : 'bg-faint-foreground/60',
                    )}
                  />
                  WebMCP
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {webmcp
                  ? `Your browser’s AI agent can use all ${tools.length} Unbox Box tools.`
                  : 'No browser agent detected. When your browser supports WebMCP, its agent can drive this app too.'}
              </TooltipContent>
            </Tooltip>
          </div>
          {onCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onCollapse}
                  aria-label="Hide Race Engineer"
                >
                  <PanelRightCloseIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Hide <Kbd>/</Kbd> brings it back
              </TooltipContent>
            </Tooltip>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close Race Engineer"
            >
              <XIcon />
            </Button>
          )}
        </div>
      </header>

      {messages.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <Empty className="h-full justify-end gap-4 border-0 p-0 md:p-0">
            <EmptyHeader className="max-w-none items-start text-left">
              <EmptyMedia variant="icon">
                <EngineerIcon />
              </EmptyMedia>
              <EmptyTitle className="text-lg font-semibold tracking-tight">
                Ask the pit commander
              </EmptyTitle>
              <EmptyDescription className="text-sm">
                Ask about any lap, driver or moment in this session. Answers come straight from the
                data and take you to it on screen.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="max-w-none items-start">
              <Suggestions items={suggestionsFor(view, meta)} onPick={submit} />
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
          <MessageScroller className="flex-1">
            <MessageScrollerViewport aria-label="Conversation">
              <MessageScrollerContent className="gap-5 px-4 py-4">
                {messages.map((message) => (
                  <MessageScrollerItem key={message.id} messageId={message.id}>
                    <MessageView message={message} onPick={submit} />
                  </MessageScrollerItem>
                ))}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      )}

      <form
        className="border-t p-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit(draft)
        }}
      >
        <InputGroup className="rounded-xl bg-surface-2 dark:bg-surface-2">
          <label htmlFor={inputId} className="sr-only">
            Ask the Race Engineer
          </label>
          <InputGroupTextarea
            id={inputId}
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit(draft)
              }
            }}
            placeholder={suggestionsFor(view, meta)[view === 'replay' ? 1 : 0] ?? 'Ask anything'}
            className="max-h-32 min-h-11 py-3 text-sm placeholder:text-faint-foreground"
          />
          <InputGroupAddon align="inline-end" className="self-end pb-1.5">
            <InputGroupButton
              type="submit"
              size="icon-sm"
              className="rounded-lg bg-signal text-signal-foreground hover:bg-signal/90 disabled:opacity-40"
              disabled={!draft.trim() || busy || !ready}
              aria-label="Send"
            >
              {busy ? <Spinner /> : <ArrowUpIcon />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <p className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-faint-foreground">
          <Kbd>Enter</Kbd> send <Kbd>/</Kbd> focus <Kbd>⌘K</Kbd> commands
        </p>
      </form>
    </aside>
  )
}
