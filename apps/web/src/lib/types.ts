import type { Replay, SessionMeta } from '@unbox-box/tools'

/** A loaded race: its metadata plus the replay. Props for every replay and strategy card. */
export interface RaceData {
  meta: SessionMeta
  replay: Replay
}
