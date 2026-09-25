import { DISCLAIMER } from '@/lib/legal'

/** The full legal notice (lib/legal.ts), for the Credits and Help pages. */
export function Disclaimer({ headingLevel = 3 }: { headingLevel?: 2 | 3 | 4 }) {
  const Heading = `h${headingLevel}` as const
  return (
    <div className="grid gap-4 text-sm leading-relaxed text-muted-foreground">
      {DISCLAIMER.map((section) => (
        <section key={section.title} className="grid gap-2">
          <Heading className="text-label text-foreground">{section.title}</Heading>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </section>
      ))}
    </div>
  )
}
