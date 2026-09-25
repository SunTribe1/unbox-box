/** The legal notices, written once and shown wherever credits are: the footer (short), the
 *  Credits and Help pages (full), llms.txt, the README and the data licence. */

export const F1_MARKS =
  'F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks are trade marks of Formula One Licensing B.V.'

/** One sentence plus the F1 marks: for footers and summaries. */
export const DISCLAIMER_SHORT = `Unbox Box is an unofficial, non-commercial fan project and is not associated in any way with the Formula 1 companies. ${F1_MARKS}`

/** Names that appear in the app, listed so their owners' rights are acknowledged explicitly. */
export const NAMED_MARKS = [
  'Formula 1',
  'F1',
  'F1 TV',
  'FIA',
  'Alpine',
  'Aston Martin',
  'Audi',
  'Cadillac',
  'Ferrari',
  'Haas F1 Team',
  'McLaren',
  'Mercedes',
  'Racing Bulls',
  'Red Bull',
  'Red Bull Racing',
  'Sauber',
  'Williams',
  'Honda',
  'Renault',
  'Ford',
  'Pirelli',
] as const

export interface DisclaimerSection {
  title: string
  paragraphs: string[]
}

export const DISCLAIMER: DisclaimerSection[] = [
  {
    title: 'Unofficial',
    paragraphs: [
      'Unbox Box is unofficial and is not associated in any way with the Formula 1 companies. It is not endorsed or sponsored by Formula One World Championship Limited, Formula One Management, Formula One Licensing B.V., the FIA or any team.',
      F1_MARKS,
      'This is a free, non-commercial, fan-made application. It has no advertising, sponsorship or affiliate links.',
    ],
  },
  {
    title: 'Trade marks',
    paragraphs: [
      'All product and company names are trade marks™ or registered® trade marks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.',
      `${NAMED_MARKS.map((m) => `“${m}”`).join(', ')}, and every other team, constructor, engine, tyre and sponsor name, past or present, are trade marks of their respective owners. They are not affiliated with, and do not sponsor or endorse, Unbox Box or its contributors.`,
      'Names of drivers, teams, circuits and events are used only to identify them, as facts. Team colours are our own approximations for telling cars apart on charts. Unbox Box uses no official photographs, logos, liveries, broadcast footage or audio.',
    ],
  },
  {
    title: 'Data',
    paragraphs: [
      'Timing and telemetry come from TracingInsights (MIT for 2023–2024, Apache-2.0 from 2025), and results since 1950 from F1DB (CC BY 4.0), each used under its open licence, converted and resampled by us. TracingInsights, F1DB, FastF1 and the other projects credited here are independent and do not endorse Unbox Box.',
      'Figures are provided as they are, without warranty, and may contain errors from the sources or from our processing.',
    ],
  },
]
