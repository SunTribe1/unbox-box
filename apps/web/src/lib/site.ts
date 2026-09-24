/** The site's public URL, for absolute links in previews, the sitemap and robots.txt:
 *  NEXT_PUBLIC_SITE_URL if set, else Vercel's production domain, else none. */
export const SITE_URL: string | undefined =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined)

/** The link-preview image (public/brand/og.png). */
export const OG_IMAGE = { url: '/brand/og.png', width: 1200, height: 630, alt: 'Unbox Box logo' }

/** The source repository: this project's GitHub repo unless a fork sets its own. */
export const REPO_URL: string =
  process.env.NEXT_PUBLIC_REPO_URL ?? 'https://github.com/SunTribe1/unbox-box'
