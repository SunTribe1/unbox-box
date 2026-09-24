/**
 * Team colors, tuned per theme. Broadcast team colors are chosen for liveries, not for thin
 * lines on a near-black chart, so each is lifted for dark surfaces and deepened for light
 * ones, and near-identical hues are pushed apart (the four blues, the two reds, the greys).
 * Colors are hex so canvas code (uPlot, the replay track) can use them directly.
 */

export interface TeamColor {
  dark: string
  light: string
}

const TEAMS: Record<string, TeamColor> = {
  'red bull racing': { dark: '#4a7ff0', light: '#2553b8' },
  'red bull': { dark: '#4a7ff0', light: '#2553b8' },
  ferrari: { dark: '#ff3b4f', light: '#d0102f' },
  mercedes: { dark: '#35e0c4', light: '#0a8f7c' },
  mclaren: { dark: '#ff9a3c', light: '#d9650b' },
  'aston martin': { dark: '#2fbf8a', light: '#12815c' },
  alpine: { dark: '#ff7ac2', light: '#d0407f' },
  williams: { dark: '#5cc8ff', light: '#1d86c4' },
  'racing bulls': { dark: '#8aa8ff', light: '#4a64d6' },
  rb: { dark: '#8aa8ff', light: '#4a64d6' },
  alphatauri: { dark: '#8fa6c9', light: '#4c6285' },
  'kick sauber': { dark: '#52e37a', light: '#16934a' },
  'alfa romeo': { dark: '#e0607e', light: '#a8284b' },
  haas: { dark: '#b8bec6', light: '#5f666e' },
  audi: { dark: '#e6e9ef', light: '#3d434d' },
  cadillac: { dark: '#d9b75a', light: '#94731b' },
  // Historic teams, from each team's best-known livery, tuned for both themes.
  brawn: { dark: '#d8f25a', light: '#6f8a00' },
  benetton: { dark: '#4fc3a1', light: '#0f7a5c' },
  jordan: { dark: '#ffd84a', light: '#9a7b00' },
  lotus: { dark: '#e3c26a', light: '#8a6d12' },
  brabham: { dark: '#6fa8ff', light: '#2356b8' },
  tyrrell: { dark: '#7aa7e8', light: '#2f5fa8' },
  cooper: { dark: '#6fcf8e', light: '#1d7d45' },
  vanwall: { dark: '#5bb98c', light: '#1f6f4a' },
  maserati: { dark: '#ff7b6b', light: '#b3261e' },
  bar: { dark: '#f0f2f5', light: '#454b55' },
  toyota: { dark: '#ff6b6b', light: '#b3121f' },
  'force india': { dark: '#ff9fd0', light: '#c2407f' },
  'racing point': { dark: '#ff9fd0', light: '#c2407f' },
  sauber: { dark: '#6f8cff', light: '#2d4bc4' },
  'bmw sauber': { dark: '#8fb4ff', light: '#2f5fc4' },
  'toro rosso': { dark: '#7f9cff', light: '#3450c0' },
  minardi: { dark: '#c9cfd6', light: '#4a515b' },
  jaguar: { dark: '#4fd08a', light: '#14804a' },
  stewart: { dark: '#e8eef5', light: '#3a4150' },
  honda: { dark: '#f5f5f5', light: '#3a3f47' },
  ligier: { dark: '#6fb6ff', light: '#1f64b0' },
  arrows: { dark: '#ff9a52', light: '#b85a10' },
  march: { dark: '#ff8f8f', light: '#b02a2a' },
  matra: { dark: '#6f9dff', light: '#2451c0' },
  wolf: { dark: '#e6c46a', light: '#8a6a10' },
  shadow: { dark: '#b8bec6', light: '#4f565f' },
  prost: { dark: '#7aa2ff', light: '#2a52c0' },
  toleman: { dark: '#6fc0ff', light: '#1d6fae' },
  caterham: { dark: '#5ed17a', light: '#177a36' },
  marussia: { dark: '#ff6b7a', light: '#b3162c' },
  manor: { dark: '#ff6b7a', light: '#b3162c' },
}

const FALLBACK: TeamColor = { dark: '#9aa3ad', light: '#5b636c' }

/** "Haas F1 Team", "Visa Cash App RB", "Stake F1 Team Kick Sauber" → a known key. */
export function teamKey(team: string): string {
  const t = team
    .toLowerCase()
    .replace(/\bf1 team\b/g, '')
    .trim()
  if (TEAMS[t]) return t
  const hit = Object.keys(TEAMS)
    .sort((a, b) => b.length - a.length)
    .find((key) => new RegExp(`\\b${key}\\b`).test(t))
  return hit ?? t
}

export function teamColor(team: string | undefined, theme: 'dark' | 'light'): string {
  const entry = (team && TEAMS[teamKey(team)]) || FALLBACK
  return entry[theme]
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Rough perceptual distance (redmean). Below ~90 two thin lines read as the same color. */
export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const rm = (r1 + r2) / 2
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db)
}

/** Mixes a color toward white (dark theme) or black (light theme). */
export function tint(hex: string, amount: number, theme: 'dark' | 'light'): string {
  const target = theme === 'dark' ? 255 : 0
  const mixed = hexToRgb(hex).map((c) => Math.round(c + (target - c) * amount))
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

const MIN_DISTANCE = 90

export interface DuelColors {
  a: string
  b: string
  /** True when B had to be tinted (teammates or look-alike teams); B is drawn dashed too. */
  shared: boolean
}

/** Colors for a head-to-head: each driver's team color, with B tinted when they'd clash. */
export function duelColors(
  teamA: string | undefined,
  teamB: string | undefined,
  theme: 'dark' | 'light',
): DuelColors {
  const a = teamColor(teamA, theme)
  const b = teamColor(teamB, theme)
  const clash =
    (teamA && teamB && teamKey(teamA) === teamKey(teamB)) || colorDistance(a, b) < MIN_DISTANCE
  return clash ? { a, b: tint(b, 0.55, theme), shared: true } : { a, b, shared: false }
}
