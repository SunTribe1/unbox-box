import { tools } from '@unbox-box/tools'
import type { Metadata } from 'next'
import { JsonLdScript } from '@/components/json-ld'
import { LandingPage } from '@/features/landing/landing-page'
import { siteLd } from '@/lib/seo/json-ld'
import { SITE_URL } from '@/lib/site'

const DESCRIPTION =
  'F1 interactive data analysis: compare Formula 1 telemetry lap by lap, replay races, analyse tyre strategy and explore every Grand Prix result since 1950. Free, and an AI agent can drive it. Unofficial fan project.'

export const metadata: Metadata = {
  title: 'Unbox Box · F1 Interactive Data Analysis',
  description: DESCRIPTION,
  ...(SITE_URL && { alternates: { canonical: '/' } }),
}

/** The landing page. The tool catalogue is read from the registry at build time, so the page
 *  never lists a tool that doesn't exist. */
export default function Home() {
  return (
    <>
      <JsonLdScript data={siteLd(DESCRIPTION)} />
      <LandingPage tools={tools.map(({ name, title, readOnly }) => ({ name, title, readOnly }))} />
    </>
  )
}
