import { tools } from '@unbox-box/tools'
import type { Metadata } from 'next'
import { LandingPage } from '@/features/landing/landing-page'

export const metadata: Metadata = {
  title: 'Unbox Box · Formula 1 analysis you can ask in plain English',
  description:
    'Lap duels, race replays, strategy what-ifs and every Grand Prix since 1950. Free, open source, and an AI agent can drive it. Unofficial fan project.',
}

/** The landing page. The tool catalogue is read from the registry at build time, so the page
 *  never lists a tool that doesn't exist. */
export default function Home() {
  return (
    <LandingPage tools={tools.map(({ name, title, readOnly }) => ({ name, title, readOnly }))} />
  )
}
