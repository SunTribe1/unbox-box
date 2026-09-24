import type * as React from 'react'
import type { Term } from './help-content'

/** Building blocks shared by the user and developer guides. */

export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-4 gap-3">
      <div className="grid gap-0.5">
        <h2 id={`${id}-title`} className="text-title">
          {title}
        </h2>
        {description && <p className="text-caption text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

export function Swatch({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={`inline-block size-3 shrink-0 rounded-[3px] ${className ?? ''}`}
      style={style}
      aria-hidden
    />
  )
}

export function LegendRow({
  mark,
  children,
}: {
  mark: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <li className="grid grid-cols-[4.5rem_1fr] items-center gap-3 text-sm">
      <span className="flex items-center gap-1.5">{mark}</span>
      <span className="text-muted-foreground">{children}</span>
    </li>
  )
}

export function Terms({ terms }: { terms: Term[] }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 @min-[800px]:grid-cols-2">
      {terms.map((t) => (
        <div key={t.term} className="grid gap-0.5">
          <dt className="text-sm font-medium">{t.term}</dt>
          <dd className="text-sm text-muted-foreground">{t.meaning}</dd>
        </div>
      ))}
    </dl>
  )
}
