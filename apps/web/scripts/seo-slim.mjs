// Keeps only what the prerendered session pages show (src/lib/seo/session-source.ts reads
// it back). A race's meta and replay are ~1 MB together; the pages need ~10 KB of it.

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]))

export function slimMeta(meta) {
  return {
    ...pick(meta, ['id', 'season', 'round', 'event', 'session', 'date', 'weather', 'drivers']),
    circuit: pick(meta.circuit ?? {}, ['name', 'length', 'corners']),
    results: meta.results ?? [],
  }
}

export function slimReplay(replay) {
  return pick(replay, ['totalLaps', 'stints', 'pits', 'trackStatus', 'classification'])
}
