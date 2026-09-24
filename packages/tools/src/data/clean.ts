/** Upstream data fixes applied as files are parsed, so every consumer sees clean data. */

interface Stint {
  stint: number | null
  compound: string
  from: number
  to: number
  age: number
}

interface Pit {
  driver: string
  lap: number
}

interface WithStints {
  stints: Record<string, Stint[]>
  pits: Pit[]
}

/**
 * FastF1-derived race data sometimes splits a stint where no stop happened (typically lap 2,
 * a start-procedure artefact): the "new" stint has the same compound and its tyre age simply
 * continues. Those stints are merged and the phantom pit entry at the boundary is dropped, so
 * stint charts, pit tables and the pit-loss model aren't skewed.
 */
export function cleanReplay<T extends WithStints>(replay: T): T {
  const phantom = new Set<string>()
  const stints: Record<string, Stint[]> = {}
  for (const [driver, list] of Object.entries(replay.stints)) {
    const merged: Stint[] = []
    for (const s of [...list].sort((a, b) => a.from - b.from)) {
      const prev = merged.at(-1)
      const continues =
        prev &&
        prev.compound === s.compound &&
        s.from === prev.to + 1 &&
        s.age === prev.age + (prev.to - prev.from + 1)
      if (prev && continues) {
        phantom.add(`${driver}:${prev.to}`)
        merged[merged.length - 1] = { ...prev, to: s.to }
      } else {
        merged.push({ ...s })
      }
    }
    stints[driver] = merged
  }
  if (!phantom.size) return replay
  return {
    ...replay,
    stints,
    pits: replay.pits.filter((p) => !phantom.has(`${p.driver}:${p.lap}`)),
  }
}
