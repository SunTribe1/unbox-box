// Unbox Box motorsport icons. One style: 24px grid, 1.5 stroke, round caps and joins,
// currentColor, parallel strokes at least 2.5 units apart. Same API shape as lucide-react,
// so they drop in anywhere a lucide icon does. Preview: docs/icon-set.html
import { forwardRef, type SVGProps } from 'react'
import { cn } from '@/lib/utils'

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number | string
}

function createIcon(name: string, body: React.ReactNode) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(
    ({ size = 24, strokeWidth = 1.5, className, ...props }, ref) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={props['aria-label'] ? undefined : true}
        className={cn('pw-icon', `pw-icon-${name}`, className)}
        {...props}
      >
        {body}
      </svg>
    ),
  )
  Icon.displayName = name
  return Icon
}

export const F1CarIcon = createIcon(
  'f1-car',
  <>
    <path d="M2 6.5h4.5M3 6.5v4" />
    <path d="M3 10.5h4c.8 0 1.4-.4 1.9-1l.9-1.2c.4-.5.9-.8 1.6-.8h.6l1 2.5h1.5l8 3v2.5h-1.5" />
    <path d="M3 15.5V13" />
    <path d="M9 15.5h7" />
    <circle cx="6" cy="15.5" r="3" />
    <circle cx="18.5" cy="15.5" r="2.5" />
  </>,
)

export const SafetyCarIcon = createIcon(
  'safety-car',
  <>
    <path d="M4 15.5H2.75a.75.75 0 0 1-.75-.75V12.5c0-.9.8-1.5 2-1.75L8 10c1.5-1.75 3-2.5 5.5-2.5 2 0 3.25 1 4.5 2.25l2.5.75c1 .3 1.5 1 1.5 2v2.25a.75.75 0 0 1-.75.75H20" />
    <path d="M9 15.5h6" />
    <path d="M11.5 5h3" />
    <circle cx="6.5" cy="15.5" r="2.5" />
    <circle cx="17.5" cy="15.5" r="2.5" />
  </>,
)

export const TyreIcon = createIcon(
  'tyre',
  <>
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="12" cy="12" r="4.5" />
    <path d="M5.42 9.61A7 7 0 0 1 18.58 9.61" />
    <path d="M18.58 14.39A7 7 0 0 1 5.42 14.39" />
  </>,
)

export const DriverIcon = createIcon(
  'driver',
  <>
    <path d="M7 10.5a5 5 0 0 1 10 0V13a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 13z" />
    <rect x="9.5" y="9.5" width="5" height="2.5" rx="1.25" />
    <path d="M4 21.5c0-2.8 2.2-4.5 5-4.5h6c2.8 0 5 1.7 5 4.5" />
  </>,
)

export const HelmetIcon = createIcon(
  'helmet',
  <>
    <path d="M4 15c0-5.8 3.9-10 9-10 4.4 0 7 3.3 7 7.2V16a2.5 2.5 0 0 1-2.5 2.5h-10A3.5 3.5 0 0 1 4 15z" />
    <path d="M20 10h-7a2 2 0 0 0-2 2v.5a2 2 0 0 0 2 2h7" />
    <path d="M8 20.5h8" />
  </>,
)

export const EngineerIcon = createIcon(
  'engineer',
  <>
    <path d="M4.5 13v-1.5a7.5 7.5 0 0 1 15 0V13" />
    <rect x="3" y="13" width="4" height="6" rx="1.5" />
    <rect x="17" y="13" width="4" height="6" rx="1.5" />
    <path d="M19 19c0 1.5-1.25 2.5-3 2.5h-2.5" />
  </>,
)

export const LapDuelIcon = createIcon(
  'lap-duel',
  <>
    <path d="M3 3.5V20.5H20.5" />
    <path d="M7 14l3.5-5.5 3 3.5 6-7" />
    <path d="M7 17.5l3.5-2 3 1.5 6-4" />
  </>,
)

export const ReplayIcon = createIcon(
  'replay',
  <>
    <path d="M13.5 19.5H7a3.5 3.5 0 0 1-3.4-4.3l2-8.2a2 2 0 0 1 3.6-.6l2.3 3.4a1.5 1.5 0 0 0 2.4.1l1.8-2.2a2 2 0 0 1 3.3.3l2.2 4.4a3.5 3.5 0 0 1-1.6 4.7" />
    <circle cx="17.25" cy="19" r="1.75" />
  </>,
)

export const StrategyIcon = createIcon(
  'strategy',
  <>
    <rect x="3" y="3.5" width="7" height="3.5" rx="1.75" />
    <rect x="13" y="3.5" width="8" height="3.5" rx="1.75" />
    <rect x="3" y="10.25" width="11" height="3.5" rx="1.75" />
    <rect x="17" y="10.25" width="4" height="3.5" rx="1.75" />
    <rect x="3" y="17" width="4" height="3.5" rx="1.75" />
    <rect x="10" y="17" width="11" height="3.5" rx="1.75" />
  </>,
)

export const SteeringWheelIcon = createIcon(
  'steering-wheel',
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M9.5 12H3M14.5 12H21M12 14.5V21" />
  </>,
)

export const StopwatchIcon = createIcon(
  'stopwatch',
  <>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M10 2.5h4M12 2.5v3.5" />
    <path d="M18.5 7l1-1" />
    <path d="M12 13.5l3-3" />
  </>,
)

export const ChequeredFlagIcon = createIcon(
  'chequered-flag',
  <>
    <path d="M5 21V3" />
    <path d="M5 4c2.7-1.3 4.7 1.2 7 0s4.3-1.2 7 0v9c-2.7-1.2-4.7-1.2-7 0s-4.3 1.3-7 0" />
    <path
      fill="currentColor"
      stroke="none"
      d="M6 5.3l3-.3v3l-3 .4zM12 5v3l3-.7V4.3zM9 8l3 0v3l-3 .3zM15 7.3l3 .2v3l-3-.1z"
    />
  </>,
)

export const StartLightsIcon = createIcon(
  'start-lights',
  <>
    <rect x="3" y="5" width="18" height="8" rx="2.5" />
    <circle cx="7.5" cy="9" r="1.25" />
    <circle cx="12" cy="9" r="1.25" />
    <circle cx="16.5" cy="9" r="1.25" />
    <path d="M7 13v8M17 13v8" />
  </>,
)

export const PodiumIcon = createIcon(
  'podium',
  <>
    <path d="M10 2.5h4v2a2 2 0 0 1-4 0z" />
    <path d="M12 6.5v2" />
    <path d="M9 21V10.5h6V21" />
    <path d="M3.5 21v-6H9M20.5 21v-4H15" />
    <path d="M2 21h20" />
    <path d="M11.25 14.25 12.25 13.5V18" />
  </>,
)

export const TrophyIcon = createIcon(
  'trophy',
  <>
    <path d="M7 3.5h10V8a5 5 0 0 1-10 0z" />
    <path d="M7 5.5H4.5a2.5 2.5 0 0 0 2.5 3.5M17 5.5h2.5A2.5 2.5 0 0 1 17 9" />
    <path d="M12 13v4M8.5 21h7M10 17h4v4" />
  </>,
)

export const PitBoardIcon = createIcon(
  'pit-board',
  <>
    <rect x="4" y="3" width="16" height="10" rx="2" />
    <path d="M7.5 6.5h3M7.5 9.5h6" />
    <path d="M12 13v8M10 21h4" />
  </>,
)

export const CircuitIcon = createIcon(
  'circuit',
  <>
    <path d="M7 19.5h9.5a3.5 3.5 0 0 0 2.9-5.5l-1.4-2.1a2 2 0 0 1 .1-2.3l.6-.8a2 2 0 0 0-1.5-3.3h-3.2a2 2 0 0 0-1.8 1.1l-.9 1.8a1.5 1.5 0 0 1-2.6.1L7.8 6.2A1.5 1.5 0 0 0 5 7v9a3.5 3.5 0 0 0 2 3.5z" />
    <path d="M9.5 17.5v4" />
  </>,
)

export const EngineIcon = createIcon(
  'engine',
  <>
    <path d="M8 5.5h7M11.5 5.5V8" />
    <path d="M6.5 8h9l2 2.5h2v5h-2l-2 2.5h-9z" />
    <path d="M6.5 11.5h-3M3.5 9.5v4" />
    <path d="M10 12.5l1.75-2v2.5l1.75-2" />
  </>,
)

export const RaceArchiveIcon = createIcon(
  'race-archive',
  <>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path
      fill="currentColor"
      stroke="none"
      d="M8 12.5h2.75v2.75H8zM10.75 15.25h2.5V18h-2.5zM13.25 12.5H16v2.75h-2.75z"
    />
  </>,
)

export const MedalIcon = createIcon(
  'medal',
  <>
    <path d="M8 2.5l3 6.5M16 2.5l-3 6.5" />
    <circle cx="12" cy="15" r="6" />
    <path d="M11 13.5l1.5-1.25V18" />
  </>,
)

export const GlobeIcon = createIcon(
  'globe',
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3c-2.75 2.5-4 5.5-4 9s1.25 6.5 4 9M12 3c2.75 2.5 4 5.5 4 9s-1.25 6.5-4 9" />
    <path d="M3.5 9h17M3.5 15h17" />
  </>,
)
