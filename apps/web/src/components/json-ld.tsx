import { jsonLdHtml, type JsonLd } from '@/lib/seo/json-ld'

/** Structured data for search engines. Not executed, so the CSP does not apply to it. */
export function JsonLdScript({ data }: { data: JsonLd | JsonLd[] }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }} />
  )
}
