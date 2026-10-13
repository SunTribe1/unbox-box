import type { SeoCell, SeoContent } from '@/lib/seo/content'

/** The prerendered page's summary: what the page covers, in plain HTML that works before (and
 *  without) the app's JavaScript. Readers and search engines get the same text.
 *
 *  Plain elements styled by `.seo-summary` in globals.css, not the ui/table primitives: about
 *  1,100 pages repeat these tables hundreds of cells deep, and per-cell classes (sent again as
 *  client props in the RSC payload) were most of each page's weight and of every deploy's. */
export function SeoSummary({ content }: { content: SeoContent }) {
  const { intro, tables, related } = content
  if (!intro.length && !tables.length && !related.length) return null
  return (
    <section aria-labelledby="page-summary" className="seo-summary mt-10 border-t pt-6">
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
          {/* Focusable so keyboard users can scroll a wide table sideways (WCAG 2.1.1). */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <div tabIndex={0} className="mt-2 overflow-x-auto">
            <table>
              <thead>
                <tr>
                  {table.head.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>
                        <Cell cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                    <a href={link.href}>{link.text}</a>
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
  return <a href={cell.href}>{cell.text}</a>
}
