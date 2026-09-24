/** Hex copies of theme tokens for places CSS variables can't reach: the browser theme
 *  colour, the web app manifest and canvas text. Keep them equal to `--background` in
 *  app/globals.css (the light value is oklch(0.985 0.002 250) converted to hex). */
export const BRAND_BACKGROUND = { dark: '#08090b', light: '#f9fafb' } as const

/** Text colours for labels drawn on team-coloured pills. */
export const INK = { dark: '#08090b', light: '#ffffff' } as const
