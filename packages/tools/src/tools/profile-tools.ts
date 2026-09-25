import '../zod-setup'
import { z } from 'zod'
import { resolveHistoricDriver } from '../analysis/history'
import { championshipProgression } from '../analysis/championship'
import { driverProfile, resolveTeam } from '../analysis/profiles'
import { teamProfile } from '../analysis/team-profile'
import { defineTool, type UnboxBoxContext } from './types'

async function openHistory(ctx: UnboxBoxContext) {
  ctx.commands.openView('history')
  return ctx.getHistory()
}

const span = (from: number, to: number | null) =>
  from === to ? `${from}` : `${from}–${to ?? 'now'}`

const driverProfileTool = defineTool({
  name: 'driver_profile',
  title: 'Driver profile',
  description:
    "Opens a driver's profile (any era): career numbers, every team they drove for, rates per start, places gained, best circuits and teammates.",
  input: z.object({ driver: z.string().describe('Any F1 driver, e.g. "Alonso", "Jim Clark".') }),
  readOnly: false,
  async execute({ driver }, ctx) {
    const [data, standings] = await Promise.all([openHistory(ctx), ctx.getStandings()])
    const i = resolveHistoricDriver(data, driver)
    const d = data.index.drivers[i]!
    const p = driverProfile(data, i, standings)
    ctx.commands.setHistory({ tab: 'drivers', driver: d.id })
    const lines = [
      `${d.name}: ${d.titles} title${d.titles === 1 ? '' : 's'}, ${d.wins} wins, ${d.podiums} podiums, ${d.poles} poles from ${d.starts} starts.`,
      `Teams: ${p.teams.map((t) => `${t.name} (${span(t.from, t.to)})`).join(', ')}.`,
      `Win rate ${(p.rates.win * 100).toFixed(1)}%, podium rate ${(p.rates.podium * 100).toFixed(1)}%.`,
    ]
    if (p.teammates[0]) {
      const m = p.teammates[0]
      lines.push(
        `Most races with ${data.index.drivers[m.driver]!.name} (${m.races}), finishing ahead ${m.ahead}–${m.behind}.`,
      )
    }
    return { text: lines.join('\n'), data: p, effect: `History → ${d.lastName}'s profile` }
  },
})

const teamProfileTool = defineTool({
  name: 'team_profile',
  title: 'Team profile',
  description:
    "Opens a team's profile: every name it raced under (e.g. Toleman → Benetton → Renault → Alpine), titles, wins by season and its drivers.",
  input: z.object({ team: z.string().describe('A constructor, e.g. "Ferrari", "Williams".') }),
  readOnly: false,
  async execute({ team }, ctx) {
    const [data, standings] = await Promise.all([openHistory(ctx), ctx.getStandings()])
    const i = resolveTeam(data, team)
    if (i < 0) throw new Error(`No Formula 1 team matches "${team}".`)
    const c = data.index.constructors[i]!
    const p = teamProfile(data, i, standings)
    ctx.commands.setHistory({ tab: 'teams', team: c.id })
    const titles = p.seasons.filter((s) => s.champion).map((s) => s.year)
    const lines = [
      `${c.name}: ${c.wins ?? 0} wins, ${c.podiums ?? 0} podiums, ${titles.length} constructors' titles${titles.length ? ` (latest ${titles.at(-1)})` : ''}, ${p.driverTitles.length} drivers' titles.`,
    ]
    if (p.lineage.length > 1) {
      lines.push(`Raced as ${p.lineage.map((l) => `${l.name} ${span(l.from, l.to)}`).join(' → ')}.`)
    }
    const top = p.drivers.slice(0, 3).map((d) => data.index.drivers[d.driver]!.name)
    if (top.length) lines.push(`Most starts: ${top.join(', ')}.`)
    return { text: lines.join('\n'), data: p, effect: `History → ${c.name}` }
  },
})

const championshipTool = defineTool({
  name: 'championship',
  title: 'Championship',
  description:
    "Opens a season's championship: points after every round (official standings, sprints included), the final table, and how the title was won.",
  input: z.object({
    season: z.number().int().min(1950).describe('Year, e.g. 2021.'),
    kind: z.enum(['drivers', 'constructors']).default('drivers'),
  }),
  readOnly: false,
  async execute({ season, kind }, ctx) {
    const [data, standings] = await Promise.all([ctx.getHistory(), ctx.getStandings()])
    const p = championshipProgression(data, standings, season, kind)
    if (!p.rows.length) throw new Error(`No ${kind}' championship data for ${season}.`)
    ctx.commands.setArchive({ season, round: undefined, section: 'championship' })
    ctx.commands.openView('races')
    const name = (id: number) =>
      kind === 'drivers' ? data.index.drivers[id]!.name : data.index.constructors[id]!.name
    // The latest season may still be running: its leader isn't champion yet.
    const live = season === data.index.latestSeason
    const [first, second] = p.rows
    const total = (row: typeof first) => row?.points.at(-1) ?? 0
    // Who led after each round, to tell a runaway from a fight.
    const leaders = p.rounds.map((_, r) => {
      let best = p.rows[0]!
      for (const row of p.rows) if ((row.points[r] ?? -1) > (best.points[r] ?? -1)) best = row
      return best.id
    })
    const changes = leaders.filter((id, r) => r > 0 && id !== leaders[r - 1]).length
    const lines = [
      `${season} ${kind === 'drivers' ? "drivers'" : "constructors'"} ${live ? 'leader' : 'champion'}: ${name(first!.id)} on ${total(first)} points${second ? `, ${total(first) - total(second)} ahead of ${name(second.id)}` : ''}${live ? ` after ${p.rounds.length} rounds` : ''}.`,
      `The lead changed hands ${changes} time${changes === 1 ? '' : 's'} over ${p.rounds.length} rounds.`,
      `Top five: ${p.rows
        .slice(0, 5)
        .map((r) => `${name(r.id)} ${total(r)}`)
        .join(', ')}.`,
    ]
    return { text: lines.join('\n'), data: p, effect: `History → ${season} championship` }
  },
})

export const profileTools = [driverProfileTool, teamProfileTool, championshipTool] as const
