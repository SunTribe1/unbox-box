import type { View } from '@unbox-box/tools'

/** Words for the Help page: what each section is for, how to read it, and the terms it uses.
 *  Kept apart from the components so the copy is easy to review in one place. */

export interface Guide {
  view: View
  /** What the section answers, in one line. */
  purpose: string
  /** How to use it, step by step. */
  steps: string[]
  /** One thing people tend to miss. */
  tip?: string
}

export const GUIDES: Guide[] = [
  {
    view: 'lap-duel',
    purpose: 'Where one lap gained or lost time on another, corner by corner.',
    steps: [
      'Pick a session in the top bar, then Driver A and Driver B and a lap for each.',
      'On the gap trace, above zero means Driver B is behind at that point; below zero, Driver A is.',
      'Hover or drag across any chart to move the cursor on every chart and on the map.',
      'Click a corner number on the map to zoom the charts to that corner.',
    ],
    tip: 'Drag the chart cards by their handle to put the traces you care about on top.',
  },
  {
    view: 'replay',
    purpose: 'The whole race on the track map, with the timing tower beside it.',
    steps: [
      'Press play, or drag the timeline. Yellow bands are safety car or VSC periods; red is a red flag.',
      'Click a driver in the tower to follow them: the heads-up display shows their speed and last-lap sectors.',
      'Race-control messages pop up as they happened.',
    ],
    tip: 'Space plays and pauses; the arrow keys skip ten seconds.',
  },
  {
    view: 'strategy',
    purpose: 'Tyres, pit stops and what a different call would have done.',
    steps: [
      'The stint chart shows who ran which compound and when they stopped.',
      'Lap times and positions show where a strategy paid off.',
      'The simulator replays the race 500 times with your pit lap and compound.',
      'The undercut check says whether stopping first would have got a driver past.',
    ],
  },
  {
    view: 'history',
    purpose: 'Any two drivers compared, and a profile for every driver and team since 1950.',
    steps: [
      'Head to head: pick two drivers from any era; races they both started are compared.',
      'Drivers and Teams: search for anyone. Profiles show totals, seasons, teammates, cars and family.',
    ],
    tip: 'Every driver or team name in the app opens its profile here.',
  },
  {
    view: 'races',
    purpose: 'Every Grand Prix weekend since 1950, every session.',
    steps: [
      'Choose a season: Championship shows the title fight round by round, Calendar every race.',
      'Open a weekend for its race, qualifying, grid, sprint, practice, pit stops and fastest laps.',
      'Weekends from 2023 on link straight to their telemetry in Lap Duel and Replay.',
    ],
  },
  {
    view: 'circuits',
    purpose: 'Every circuit: layout, corners, lap record, winners and past layouts.',
    steps: [
      'Search by name, city or country, or switch between this season and all time.',
      'A circuit page lists its most successful drivers and teams and every winner.',
    ],
  },
  {
    view: 'records',
    purpose: 'Leaderboards for drivers and teams, and the most remarkable races.',
    steps: [
      'Choose Drivers or Teams, then a board: wins, poles, youngest winners, win streaks...',
      'The era filter limits counts to a decade. Boards marked "all time" are career totals.',
      'Moments has the closest finishes, biggest wins and best pit crews by season.',
    ],
  },
  {
    view: 'engines',
    purpose: 'Every engine and tyre maker: who they supplied and how they did.',
    steps: [
      'Switch between engines and tyres, and between this season and all time.',
      'A maker page shows wins by season, the teams it supplied and, for engines, what it built.',
    ],
  },
  {
    view: 'nations',
    purpose: 'Drivers, champions, teams and circuits by country.',
    steps: ['Filter by continent or search, then open a country.'],
  },
]

export interface Term {
  term: string
  meaning: string
}

export const GLOSSARY: Term[] = [
  {
    term: 'Delta / gap',
    meaning:
      'Time between two laps at the same point on track. In Lap Duel, above zero means Driver B is behind.',
  },
  {
    term: 'Mini-sector',
    meaning: 'A short slice of the lap; the map colours each one by whoever was faster there.',
  },
  {
    term: 'Ideal lap',
    meaning: "A driver's best three sectors added together, even if set on different laps.",
  },
  {
    term: 'Speed trap',
    meaning: 'Top speed measured at a fixed point, usually at the end of the longest straight.',
  },
  {
    term: 'Lift and coast',
    meaning: 'Off the throttle before the braking point to save fuel or brakes.',
  },
  {
    term: 'DRS',
    meaning:
      'Drag Reduction System: a flap in the rear wing that opens on straights to help overtaking.',
  },
  { term: 'Stint', meaning: 'The laps run on one set of tyres, between stops.' },
  { term: 'Degradation', meaning: 'How much slower a tyre gets each lap as it wears.' },
  {
    term: 'Pit loss',
    meaning: 'Time lost making a pit stop compared with staying out: pit lane plus the stop.',
  },
  {
    term: 'Undercut',
    meaning: 'Stopping before a rival so fresh tyres make up the gap before they stop.',
  },
  {
    term: 'Overcut',
    meaning: 'Staying out longer than a rival and gaining while they warm up new tyres.',
  },
  {
    term: 'SC / VSC',
    meaning: 'Safety car / virtual safety car: the field slows, so a stop costs less time.',
  },
  { term: 'Pole', meaning: 'First place on the starting grid, usually from qualifying.' },
  {
    term: 'Grand slam',
    meaning: 'Pole, the win, the fastest lap and leading every lap, all in one race.',
  },
  { term: 'Driver of the Day', meaning: 'Fan vote after each race, since 2016.' },
  {
    term: 'Sprint',
    meaning: 'A short Saturday race at some weekends, with its own qualifying and points.',
  },
  { term: 'Knockout qualifying', meaning: 'Q1, Q2 and Q3: the slowest drop out after each part.' },
]

/** Result codes as F1DB prints them. */
export const RESULT_CODES: Term[] = [
  { term: 'DNF / reason', meaning: 'Did not finish; the table shows why (engine, accident...).' },
  { term: 'NC', meaning: 'Not classified: finished, but too few laps to count.' },
  { term: 'DSQ', meaning: 'Disqualified after the race.' },
  { term: 'DNS', meaning: 'Did not start.' },
  { term: 'DNQ', meaning: 'Did not qualify for the race.' },
  { term: 'DNPQ', meaning: 'Did not pre-qualify (late 1980s and early 1990s).' },
  { term: 'EX', meaning: 'Excluded from the event.' },
  { term: 'SFB', meaning: 'Grid penalty: started from the back.' },
]
