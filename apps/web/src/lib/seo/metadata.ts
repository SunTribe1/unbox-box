import type { Metadata } from 'next'
import { OG_IMAGE, SITE_URL } from '../site'

/** Title, description, canonical link and link preview for one page. */
export function pageMetadata(p: { path: string; heading: string; description: string }): Metadata {
  const title = `${p.heading} · Unbox Box`
  return {
    title,
    description: p.description,
    // Canonical links must be absolute, so they need the site's URL.
    ...(SITE_URL && { alternates: { canonical: p.path } }),
    openGraph: { title, description: p.description, url: p.path, images: [OG_IMAGE] },
    twitter: { title, description: p.description },
  }
}
