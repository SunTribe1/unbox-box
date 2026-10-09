import type { SeoCell, SeoContent } from '@/lib/seo/content'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/** The prerendered page's summary: what the page covers, in plain HTML that works before (and
 *  without) the app's JavaScript. Readers and search engines get the same text. */
export function SeoSummary({ content }: { content: SeoContent }) {
  const { intro, tables, related } = content
  if (!intro.length && !tables.length && !related.length) return null
  return (
    <section aria-labelledby="page-summary" className="mt-10 border-t pt-6">
      <h2 id="page-summary" className="text-label text-faint-foreground">
        At a glance
      </h2>
      {intro.length > 0 && (
        <div className="mt-3 max-w-prose space-y-2 text-sm leading-relaxed text-muted-foreground">
          {intro.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      {tables.map((table) => (
        // Closed by default: the view above usually shows the same data, richer. Search
        // engines still read it, and it is there for anyone without JavaScript.
        <details key={table.caption} className="group mt-5">
          <summary className="w-fit cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
            {table.caption}
          </summary>
          <Table className="mt-2 text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {table.head.map((h) => (
                  <TableHead key={h} className="h-8 text-label text-faint-foreground">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="py-1.5">
                      <Cell cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </details>
      ))}
      {related.length > 0 && (
        <nav aria-label="Related pages" className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((group) => (
            <div key={group.title}>
              <h3 className="mb-1.5 text-sm font-medium">{group.title}</h3>
              <ul className="space-y-1 text-sm">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-muted-foreground underline decoration-border underline-offset-2 hover:text-foreground hover:decoration-current"
                    >
                      {link.text}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      )}
    </section>
  )
}

function Cell({ cell }: { cell: SeoCell }) {
  if (typeof cell === 'string') return cell
  return (
    <a
      href={cell.href}
      className="underline decoration-border underline-offset-2 hover:decoration-current"
    >
      {cell.text}
    </a>
  )
}
