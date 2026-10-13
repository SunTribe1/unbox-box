import { CornerSchema, SessionMetaSchema } from '@unbox-box/tools'
import { z } from 'zod'

/** The few facts of one session the prerendered pages show: scripts/seo-slim.mjs keeps them
 *  from the session's meta.json and (races only) replay.json. Validated here, at the edge. */

const num = z.number().nullable()

export const SeoSessionMetaSchema = SessionMetaSchema.pick({
  id: true,
  season: true,
  round: true,
  event: true,
  session: true,
  date: true,
  weather: true,
  drivers: true,
  results: true,
}).extend({
  circuit: z.object({ name: z.string(), length: z.number(), corners: z.array(CornerSchema) }),
})

export const SeoReplaySchema = z.object({
  totalLaps: z.number().int(),
  stints: z.record(
    z.string(),
    z.array(z.object({ compound: z.string(), from: z.number().int(), to: z.number().int() })),
  ),
  pits: z.array(z.object({ driver: z.string(), lap: z.number().int(), duration: num })),
  trackStatus: z.array(
    z.object({ status: z.enum(['sc', 'vsc', 'red']), from: z.number(), to: z.number() }),
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

export type SeoSessionMeta = z.infer<typeof SeoSessionMetaSchema>
export type SeoReplay = z.infer<typeof SeoReplaySchema>

export interface SeoSessionDetail {
  meta: SeoSessionMeta
  replay?: SeoReplay
}
