import { VIEWS } from '@unbox-box/tools'
import type { MetadataRoute } from 'next'
import { VIEW_SLUG } from '@/lib/routes'
import { loadSeoSource } from '@/lib/seo/load-source'
import { sitemapPages } from '@/lib/seo/pages'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

const BASE = SITE_URL ?? 'http://localhost:3000'

/** Every view's page, every race weekend, driver, team, circuit and session page (src/lib/seo),
 *  plus Credits. Set NEXT_PUBLIC_SITE_URL so the URLs are absolute. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, priority: 1 },
    ...VIEWS.map((v) => ({ url: `${BASE}/${VIEW_SLUG[v]}/`, priority: 0.8 })),
    ...sitemapPages(loadSeoSource()).map((p) => ({
      url: `${BASE}${p.path}`,
      priority: p.priority,
      ...(p.date && { lastModified: p.date }),
    })),
    { url: `${BASE}/credits/`, priority: 0.3 },
  ]
}
