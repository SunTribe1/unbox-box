import '../zod-setup'
import { z } from 'zod'

/**
 * The F1DB archive beyond the history index: one file per season with every session of every
 * weekend, a catalog of engines, tyres, team cars, families and countries, and record books.
 * Indexes (`driver`, `team`, `engine`, `tyre`, `circuit`) point into the history index and
 * catalog arrays. Times are milliseconds.
 */

/** One line of any session table. Keys that don't apply to a session are absent. */
const SessionRowSchema = z.object({
  pos: z.number().optional(),
  /** Position as printed: "1", "DNF", "DSQ", "EX", "NC"... */
  text: z.string().optional(),
  driver: z.number().optional(),
  team: z.number().optional(),
  engine: z.number().optional(),
  tyre: z.number().optional(),
  number: z.string().optional(),
  time: z.number().optional(),
  gap: z.number().optional(),
  gapLaps: z.number().optional(),
  laps: z.number().optional(),
  q1: z.number().optional(),
  q2: z.number().optional(),
  q3: z.number().optional(),
  grid: z.number().optional(),
  gridText: z.string().optional(),
  qualified: z.number().optional(),
  /** Grid penalty note, e.g. "SFB" (started from the back). */
  penalty: z.string().optional(),
  timePenalty: z.number().optional(),
  points: z.number().optional(),
  gained: z.number().optional(),
  stops: z.number().optional(),
  retired: z.string().optional(),
  /** Pit stops: the stop number and lap. */
  stop: z.number().optional(),
  lap: z.number().optional(),
  /** Driver of the Day vote share. */
  percentage: z.number().optional(),
  fastestLap: z.boolean().optional(),
  pole: z.boolean().optional(),
  dotd: z.boolean().optional(),
  grandSlam: z.boolean().optional(),
  shared: z.boolean().optional(),
})

export const WEEKEND_SESSIONS = [
  'race',
  'qualifying',
  'grid',
  'sprint',
  'sprintQualifying',
  'sprintGrid',
  'qualifying1',
  'qualifying2',
  'preQualifying',
  'fp1',
  'fp2',
  'fp3',
  'fp4',
  'warmup',
  'pitStops',
  'fastestLaps',
  'driverOfTheDay',
] as const
export type WeekendSession = (typeof WEEKEND_SESSIONS)[number]

const WeekendSchema = z.object({
  round: z.number(),
  name: z.string(),
  /** "Mexican Grand Prix" (the short `name` is "Mexico"). */
  fullName: z.string().nullish(),
  officialName: z.string(),
  grandPrix: z.string(),
  date: z.string(),
  time: z.string().nullable(),
  circuit: z.number().nullable(),
  layout: z.string().nullable(),
  courseLength: z.number().nullable(),
  laps: z.number().nullable(),
  scheduledLaps: z.number().nullable(),
  distance: z.number().nullable(),
  qualifyingFormat: z.string().nullable(),
  sprintFormat: z.string().nullable(),
  driversDecider: z.boolean(),
  constructorsDecider: z.boolean(),
  /** Local start of each session: "2024-05-03T16:30" (or a bare date). */
  schedule: z.record(z.string(), z.string()),
  sessions: z.partialRecord(z.enum(WEEKEND_SESSIONS), z.array(SessionRowSchema)),
})

const SeasonStatsSchema = z.object({
  driver: z.number().optional(),
  team: z.number().optional(),
  pos: z.number().optional(),
  entries: z.number(),
  starts: z.number(),
  wins: z.number(),
  podiums: z.number(),
  poles: z.number(),
  fastestLaps: z.number(),
  points: z.number(),
  laps: z.number(),
  bestGrid: z.number().optional(),
  bestRace: z.number().optional(),
  sprintWins: z.number(),
  dotd: z.number().optional(),
  grandSlams: z.number().optional(),
  oneTwos: z.number().optional(),
})

export const SeasonArchiveSchema = z.object({
  schemaVersion: z.literal(1),
  year: z.number(),
  races: z.array(WeekendSchema),
  /** The entry list: who drove for which entrant, and in which rounds. */
  entries: z.array(
    z.object({
      entrant: z.string(),
      country: z.string().nullable(),
      constructor: z.number().nullable(),
      engine: z.number().nullable(),
      driver: z.number(),
      rounds: z.string().nullable(),
      test: z.boolean(),
    }),
  ),
  drivers: z.array(SeasonStatsSchema),
  constructors: z.array(SeasonStatsSchema),
})

const MakerSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string().nullable(),
  starts: z.number(),
  wins: z.number(),
  podiums: z.number(),
  poles: z.number(),
  fastestLaps: z.number(),
  titles: z.number(),
  points: z.number(),
  firstYear: z.number().nullable(),
  lastYear: z.number().nullable(),
})

const MakerSeasonSchema = z.object({
  year: z.number(),
  maker: z.number(),
  pos: z.number().nullable(),
  starts: z.number(),
  wins: z.number(),
  podiums: z.number(),
  poles: z.number(),
  points: z.number().nullable(),
})

export const EngineSpecSchema = z.object({
  name: z.string(),
  capacity: z.number().nullable(),
  /** "V6", "V10", "F12"... */
  layout: z.string().nullable(),
  /** "NATURALLY_ASPIRATED" | "TURBOCHARGED" | "TURBOCHARGED_HYBRID" | "SUPERCHARGED" */
  aspiration: z.string().nullable(),
})

export const CatalogSchema = z.object({
  schemaVersion: z.literal(1),
  engineMakers: z.array(MakerSchema),
  tyreMakers: z.array(MakerSchema),
  engineSeasons: z.array(MakerSeasonSchema),
  tyreSeasons: z.array(MakerSeasonSchema),
  /** Each team's car per season. */
  teamSeasons: z.array(
    z.object({
      year: z.number(),
      constructor: z.number(),
      engineMaker: z.number().nullable(),
      chassis: z.array(z.string()),
      engines: z.array(EngineSpecSchema),
      tyres: z.array(z.number()),
    }),
  ),
  /** `driver` is the `type` of `relative`: { driver: Damon, relative: Graham, type: CHILD }. */
  family: z.array(z.object({ driver: z.number(), relative: z.number(), type: z.string() })),
  countries: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      demonym: z.string().nullable(),
      continent: z.string().nullable(),
    }),
  ),
})

const RaceRefSchema = z.object({ year: z.number(), round: z.number() })

export const RecordsSchema = z.object({
  schemaVersion: z.literal(1),
  closestFinishes: z.array(
    RaceRefSchema.extend({ driver: z.number(), runnerUp: z.number(), value: z.number() }),
  ),
  biggestWins: z.array(
    RaceRefSchema.extend({ driver: z.number(), runnerUp: z.number(), value: z.number() }),
  ),
  winsFromFurthestBack: z.array(RaceRefSchema.extend({ driver: z.number(), value: z.number() })),
  driverOfTheDayShare: z.array(RaceRefSchema.extend({ driver: z.number(), value: z.number() })),
  /** Median pit-lane time against the race median, per team and season (ms; lower = faster). */
  pitCrews: z.array(
    z.object({ year: z.number(), constructor: z.number(), stops: z.number(), value: z.number() }),
  ),
})

export type SessionRow = z.infer<typeof SessionRowSchema>
export type Weekend = z.infer<typeof WeekendSchema>
export type SeasonArchive = z.infer<typeof SeasonArchiveSchema>
export type SeasonStats = z.infer<typeof SeasonStatsSchema>
export type Catalog = z.infer<typeof CatalogSchema>
export type Maker = z.infer<typeof MakerSchema>
export type EngineSpec = z.infer<typeof EngineSpecSchema>
export type Records = z.infer<typeof RecordsSchema>
