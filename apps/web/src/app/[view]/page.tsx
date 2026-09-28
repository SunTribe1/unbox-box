import { VIEWS, type View } from '@unbox-box/tools'
import type { Metadata } from 'next'
import { AppShell } from '@/features/shell/app-shell'
import { VIEW_SLUG } from '@/lib/routes'
import { pageMetadata } from '@/lib/seo/metadata'
import { VIEW_META } from '@/lib/view-meta'

/** One static page per view (/duel/, /replay/, …) so links and Back work on a plain CDN.
 *  Every page is the same app; the path picks the view on load. */
export function generateStaticParams() {
  return VIEWS.map((v) => ({ view: VIEW_SLUG[v] }))
}

export const dynamicParams = false

const viewOf = (slug: string) =>
  (Object.entries(VIEW_SLUG) as [View, string][]).find(([, s]) => s === slug)?.[0]

/** Each view's own title and description, for search results and link previews. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ view: string }>
}): Promise<Metadata> {
  const { view: slug } = await params
  const view = viewOf(slug)
  if (!view) return {}
  const { title, description } = VIEW_META[view]
  return pageMetadata({ path: `/${slug}/`, heading: title, description })
}

export default async function ViewPage({ params }: { params: Promise<{ view: string }> }) {
  const { view: slug } = await params
  const view = viewOf(slug)
  return <AppShell page={view && { path: `/${slug}/`, heading: VIEW_META[view].title }} />
}
