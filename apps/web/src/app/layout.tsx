import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { OG_IMAGE, SITE_URL } from '@/lib/site'
import type * as React from 'react'
import { Providers } from './providers'
import { BRAND_BACKGROUND } from '@/lib/brand'

/** Absolute URLs for link previews and the sitemap; set NEXT_PUBLIC_SITE_URL when deploying. */

const DESCRIPTION =
  'F1 analysis you can ask in plain English: lap duels, race replays, strategy and every Grand Prix since 1950. Unofficial fan project.'

export const metadata: Metadata = {
  ...(SITE_URL && { metadataBase: new URL(SITE_URL) }),
  title: 'Unbox Box',
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'Unbox Box',
    title: 'Unbox Box',
    description: DESCRIPTION,
    locale: 'en_GB',
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unbox Box',
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  robots: { index: true, follow: true },
  applicationName: 'Unbox Box',
  appleWebApp: { capable: true, title: 'Unbox Box', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: BRAND_BACKGROUND.dark },
    { media: '(prefers-color-scheme: light)', color: BRAND_BACKGROUND.light },
  ],
}

/** WebMCP runs as a Chrome origin trial: the token (ours, not the visitor's) is sent as a
 *  meta tag. Visitors opt into nothing. */
const ORIGIN_TRIAL = process.env.NEXT_PUBLIC_WEBMCP_ORIGIN_TRIAL

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" suppressHydrationWarning>
      <head>{ORIGIN_TRIAL && <meta httpEquiv="origin-trial" content={ORIGIN_TRIAL} />}</head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface-3 focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
