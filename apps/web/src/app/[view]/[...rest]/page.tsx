import type { Metadata } from 'next'
import { JsonLdScript } from '@/components/json-ld'
import { AppShell } from '@/features/shell/app-shell'
import { VIEW_SLUG } from '@/lib/routes'
import { loadSeoSource } from '@/lib/seo/load-source'
import { pageMetadata } from '@/lib/seo/metadata'
import { seoPages, type SeoPage } from '@/lib/seo/pages'

/** A prerendered page per race weekend, driver, team, circuit and session (src/lib/seo), each
 *  with its own title, description and structured data. Any other deep link is served the
 *  view's own page by the host's rewrites, as before. */

interface Params {
  view: string
  rest: string[]
}

let byPath: Map<string, SeoPage> | undefined
const pages = () => (byPath ??= new Map(seoPages(loadSeoSource()).map((p) => [p.path, p])))

const pageFor = ({ view, rest }: Params) =>
  pages().get(`/${[view, ...rest.map(decodeURIComponent)].join('/')}/`)

export function generateStaticParams(): Params[] {
  return [...pages().values()].map((p) => ({ view: VIEW_SLUG[p.view], rest: p.segments }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const page = pageFor(await params)
  return page ? pageMetadata(page) : {}
}

export default async function DeepPage({ params }: { params: Promise<Params> }) {
  const page = pageFor(await params)
  return (
    <>
      {page && <JsonLdScript data={page.jsonLd} />}
      <AppShell page={page && { path: page.path, heading: page.heading }} />
    </>
  )
}
