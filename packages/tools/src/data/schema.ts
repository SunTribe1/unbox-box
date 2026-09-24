import '../zod-setup'
import { cleanReplay } from './clean'
import { z } from 'zod'

/** Runtime schemas for the static data files. TypeScript types are inferred from these,
 *  so the file format is defined exactly once (DRY). Mirrors pipeline/unbox_box_pipeline/build.py. */

const num = z.number().nullable()

export const LapSchema = z.object({
  lap: z.number().int(),
  time: num,
  s1: num,
  s2: num,
  s3: num,
  segment: z.string().nullable(),
  compound: z.string().nullable(),
  deleted: z.boolean(),
  speedTrap: num,
  telemetry: z.boolean(),
})

export const DriverSchema = z.object({
  code: z.string(),
  number: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  team: z.string(),
})

export const CornerSchema = z.object({
  number: z.number().int(),
  name: z.string().nullable(),
  distance: z.number(),
  x: z.number(),
  y: z.number(),
})

export const ResultSchema = z.object({
  position: z.number().int(),
  driver: z.string(),
  lap: z.number().int().nullable(),
  time: num,
  segment: z.string().nullable(),
  s1: num,
  s2: num,
  s3: num,
  compound: z.string().nullable(),
  speedTrap: num,
  // Race sessions only.
  status: z.string().optional(),
  lapsCompleted: z.number().int().optional(),
  raceTime: num.optional(),
})

export const SessionMetaSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  season: z.number().int(),
  round: z.number().int().nullish(),
  event: z.string(),
  session: z.string(),
  date: z.string().nullable(),
  circuit: z.object({
    slug: z.string(),
    name: z.string(),
    locality: z.string().nullable(),
    country: z.string().nullable(),
    length: z.number(),
    rotation: z.number(),
    corners: z.array(CornerSchema),
    aliases: z.record(z.string(), z.number()),
  }),
  weather: z.object({ airTemp: num, trackTemp: num }),
  drivers: z.array(DriverSchema),
  results: z.array(ResultSchema),
  laps: z.record(z.string(), z.array(LapSchema)),
  telemetry: z.object({
    step: z.number(),
    length: z.number(),
    points: z.number().int(),
    sectorMarks: z.tuple([z.number(), z.number()]).nullable(),
  }),
  track: z.object({ x: z.array(z.number()), y: z.array(z.number()) }),
  attribution: z.array(z.object({ name: z.string(), url: z.string(), license: z.string() })),
  replay: z.boolean().optional(),
  /** Set when this session's GPS was unusable and the map outline came from `from`. */
  quality: z.object({ outline: z.literal('borrowed'), from: z.string() }).optional(),
})

export const ReplaySchema = z
  .object({
    schemaVersion: z.literal(1),
    step: z.number(),
    duration: z.number(),
    totalLaps: z.number().int(),
    scale: z.number(),
    progress: z.record(z.string(), z.array(z.number())),
    lapStarts: z.record(z.string(), z.array(z.number().nullable())),
    stints: z.record(
      z.string(),
      z.array(
        z.object({
          stint: z.number().nullable(),
          compound: z.string(),
          from: z.number().int(),
          to: z.number().int(),
          age: z.number(),
        }),
      ),
    ),
    pits: z.array(
      z.object({
        driver: z.string(),
        lap: z.number().int(),
        in: num,
        out: num,
        duration: num,
      }),
    ),
    trackStatus: z.array(
      z.object({ status: z.enum(['sc', 'vsc', 'red']), from: z.number(), to: z.number() }),
    ),
    messages: z.array(
      z.object({
        t: z.number(),
        lap: z.number().nullable(),
        category: z.string(),
        flag: z.string().nullable(),
        message: z.string(),
      }),
    ),
    classification: z.array(
      z.object({
        position: z.number().int(),
        driver: z.string(),
        laps: z.number().int(),
        status: z.string(),
        time: num,
      }),
    ),
  })
  .transform(cleanReplay)

export const TelemetrySchema = z.object({
  driver: z.string(),
  lap: z.number().int(),
  t: z.array(z.number()),
  speed: z.array(z.number()),
  throttle: z.array(z.number()),
  brake: z.array(z.number()),
  gear: z.array(z.number()),
  rpm: z.array(z.number()),
  drs: z.array(z.number()),
  x: z.array(z.number()),
  y: z.array(z.number()),
  z: z.array(z.number()),
})

export const SessionIndexSchema = z.object({
  schemaVersion: z.literal(1),
  sessions: z.array(
    z.object({
      id: z.string(),
      season: z.number().int(),
      /** Championship round (from F1DB); absent in older files. */
      round: z.number().int().nullish(),
      event: z.string(),
      session: z.string(),
      date: z.string().nullable(),
      circuit: z.string(),
      /** F1DB circuit id (absent in older files). */
      circuitId: z.string().nullish(),
      country: z.string().nullish(),
    }),
  ),
})

/** data/circuits.json: a small outline per circuit (from its latest session) for Circuits. */
export const CircuitShapesSchema = z.record(
  z.string(),
  z.object({
    session: z.string(),
    rotation: z.number(),
    x: z.array(z.number()),
    y: z.array(z.number()),
    corners: z.array(
      z.object({ number: z.number(), name: z.string().nullable(), x: z.number(), y: z.number() }),
    ),
  }),
)
export type CircuitShapes = z.infer<typeof CircuitShapesSchema>

export type Lap = z.infer<typeof LapSchema>
export type Driver = z.infer<typeof DriverSchema>
export type Corner = z.infer<typeof CornerSchema>
export type Result = z.infer<typeof ResultSchema>
export type SessionMeta = z.infer<typeof SessionMetaSchema>
export type Telemetry = z.infer<typeof TelemetrySchema>
export type SessionIndex = z.infer<typeof SessionIndexSchema>
export type Replay = z.infer<typeof ReplaySchema>
export type SessionSummary = SessionIndex['sessions'][number]

const HistoryDriverSchema = z.object({
  id: z.string(),
  name: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  abbr: z.string(),
  nationality: z.string().nullable(),
  dob: z.string().nullable(),
  starts: z.number(),
  wins: z.number(),
  podiums: z.number(),
  poles: z.number(),
  fastestLaps: z.number(),
  titles: z.number(),
  points: z.number(),
  firstYear: z.number().nullable(),
  lastYear: z.number().nullable(),
  active: z.boolean(),
  // Profile extras (optional: archives built before 2026-09-24 lack them).
  number: z.string().nullish(),
  birthplace: z.string().nullish(),
  bestChampionship: z.number().nullish(),
  grandSlams: z.number().optional(),
  // Archive extras (2026-09-24 onwards): flags are ISO 3166 alpha-2 codes.
  fullName: z.string().nullish(),
  dod: z.string().nullish(),
  gender: z.string().nullish(),
  code: z.string().nullish(),
  code2: z.string().nullish(),
  birthCountry: z.string().nullish(),
  entries: z.number().optional(),
  laps: z.number().optional(),
  bestGrid: z.number().nullish(),
  bestRace: z.number().nullish(),
  sprintStarts: z.number().optional(),
  sprintWins: z.number().optional(),
  dotd: z.number().optional(),
})

const HistoryConstructorSchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string().optional(),
  country: z.string().nullish(),
  starts: z.number().optional(),
  wins: z.number().optional(),
  oneTwos: z.number().optional(),
  podiums: z.number().optional(),
  poles: z.number().optional(),
  fastestLaps: z.number().optional(),
  titles: z.number().optional(),
  points: z.number().optional(),
  bestChampionship: z.number().nullish(),
  code: z.string().nullish(),
  entries: z.number().optional(),
  laps: z.number().optional(),
  bestGrid: z.number().nullish(),
  bestRace: z.number().nullish(),
  sprintWins: z.number().optional(),
})

export const HistoryIndexSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.object({ name: z.string(), version: z.string(), url: z.string(), license: z.string() }),
  latestSeason: z.number().int(),
  drivers: z.array(HistoryDriverSchema),
  constructors: z.array(HistoryConstructorSchema),
  circuits: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      place: z.string(),
      country: z.string().nullable(),
      fullName: z.string().optional(),
      previousNames: z.string().nullish(),
      type: z.string().nullish(),
      direction: z.string().nullish(),
      lat: z.number().nullish(),
      lng: z.number().nullish(),
      length: z.number().nullish(),
      turns: z.number().nullish(),
      code: z.string().nullish(),
      /** Every layout raced here, oldest first. */
      layouts: z
        .array(
          z.object({
            id: z.string(),
            length: z.number().nullable(),
            turns: z.number().nullable(),
            from: z.number(),
            to: z.number(),
            races: z.number(),
          }),
        )
        .default([]),
    }),
  ),
  /** Race lap record per circuit layout; `current` marks the layout in use today. */
  lapRecords: z
    .array(
      z.object({
        circuit: z.number(),
        time: z.number(),
        driver: z.number(),
        year: z.number(),
        current: z.boolean(),
      }),
    )
    .default([]),
  /** Scheduled races without results yet. */
  calendar: z
    .array(
      z.object({
        year: z.number(),
        round: z.number(),
        name: z.string(),
        circuit: z.number(),
        date: z.string(),
      }),
    )
    .default([]),
  races: z.object({
    year: z.array(z.number()),
    round: z.array(z.number()),
    name: z.array(z.string()),
    circuit: z.array(z.number()),
    date: z.array(z.string()),
    laps: z.array(z.number()).optional(),
    /** 1 when the weekend had a sprint race. */
    sprint: z.array(z.number()).optional(),
    /** 1 when the drivers' title was decided at this race. */
    decider: z.array(z.number()).optional(),
  }),
  champions: z.array(z.object({ year: z.number(), driver: z.number() })),
  constructorChampions: z
    .array(z.object({ year: z.number(), constructor: z.number() }))
    .default([]),
  /** Every name a team raced under: `parent` is today's team, `constructor` the old name. */
  lineage: z
    .array(
      z.object({
        parent: z.number(),
        constructor: z.number(),
        from: z.number(),
        to: z.number().nullable(),
      }),
    )
    .default([]),
})

const RoundStandingsSchema = z.object({
  race: z.array(z.number()),
  id: z.array(z.number()),
  pos: z.array(z.number()),
  points: z.array(z.number()),
})

/** Official championship standings after every round (F1DB): sprints, dropped scores and
 *  exclusions are already applied, so totals match the record books. */
export const HistoryStandingsSchema = z.object({
  schemaVersion: z.literal(1),
  drivers: RoundStandingsSchema,
  constructors: RoundStandingsSchema,
})

export const HistoryResultsSchema = z.object({
  schemaVersion: z.literal(1),
  race: z.array(z.number()),
  driver: z.array(z.number()),
  constructor: z.array(z.number()),
  pos: z.array(z.number()),
  status: z.array(z.string()),
  grid: z.array(z.number()),
  points: z.array(z.number()),
  pole: z.array(z.number()),
  fastestLap: z.array(z.number()),
})

export type HistoryDriver = z.infer<typeof HistoryDriverSchema>
export type HistoryIndex = z.infer<typeof HistoryIndexSchema>
export type HistoryConstructor = z.infer<typeof HistoryConstructorSchema>
export type HistoryStandings = z.infer<typeof HistoryStandingsSchema>
export type HistoryResults = z.infer<typeof HistoryResultsSchema>
export interface HistoryData {
  index: HistoryIndex
  results: HistoryResults
}
