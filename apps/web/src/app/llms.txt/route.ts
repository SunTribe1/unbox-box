import { tools } from '@unbox-box/tools'
import { NAV } from '@/features/shell/nav'
import { VIEW_SLUG } from '@/lib/routes'
import { VIEW_META } from '@/lib/view-meta'
import { DISCLAIMER } from '@/lib/legal'

export const dynamic = 'force-static'

/** /llms.txt for AI agents (llmstxt.org), built from the tool registry and the views so it
 *  always matches the app. */
export function GET(): Response {
  const lines = [
    '# Unbox Box',
    '',
    '> An unofficial Formula 1 analysis web app that AI agents can drive: lap duels, race',
    '> replays, strategy, and every Grand Prix weekend since 1950.',
    '',
    '## Pages',
    '',
    ...NAV.map((n) => `- [${n.label}](/${VIEW_SLUG[n.view]}/): ${VIEW_META[n.view].description}`),
    '- [Credits and licences](/credits/): every data source, library and licence',
    '',
    '## For browser agents (WebMCP)',
    '',
    `The page registers ${tools.length} tools through WebMCP (\`document.modelContext\`). Tools that act change what is on screen, so the user sees what you do. How to enable it: [Help → For developers](/help/#dev-webmcp).`,
    '',
    ...tools.map((t) => `- ${t.name}${t.readOnly ? '' : ' (acts)'}: ${t.description}`),
    '',
    '## Data',
    '',
    '- [Data licence](/data/DATA_LICENSE.md): F1DB (CC BY 4.0); TracingInsights (MIT for 2023–2024, Apache-2.0 from 2025)',
    '- Static JSON under /data/: index.json, sessions/<id>/meta.json, sessions/<id>/tel/<DRIVER>-<LAP>.json, sessions/<id>/replay.json, history/*.json, history/seasons/<year>.json',
    '',
    '## Disclaimer',
    '',
    ...DISCLAIMER.flatMap((section) => [...section.paragraphs, '']),
    '',
  ]
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
