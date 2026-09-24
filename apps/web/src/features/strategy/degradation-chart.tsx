'use client'

import { clamp, predictLap, raceLaps } from '@unbox-box/tools'
import { useMemo } from 'react'
import { SaveImageButton } from '@/components/save-image-button'
import { compoundColor, compoundName } from '@/lib/tyres'
import { TyreIcon } from '@/components/icons'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { StrategyCardProps } from './shared'

const W = 640
const H = 320
const PAD = { l: 44, r: 150, t: 12, b: 34 }

/** Every clean lap, corrected for fuel and driver pace, against tyre age; one fitted line per
 *  compound. The slope is the degradation. */
export function DegradationChart({ meta, replay, model }: StrategyCardProps) {
  const points = useMemo(() => {
    const ref = meta.results[0]?.driver ?? ''
    return raceLaps(meta, replay)
      .filter((l) => l.clean && model.compounds[l.compound])
      .map((l) => ({
        compound: l.compound,
        age: l.age,
        // Lap time as if run by the reference driver on lap 1 fuel.
        y:
          l.time -
          (predictLap(model, l.driver, l.compound, l.age, l.lap) -
            predictLap(model, ref, l.compound, l.age, 1)),
      }))
  }, [meta, replay, model])

  const maxAge = Math.max(...points.map((p) => p.age), 10)
  const ys = points.map((p) => p.y).sort((a, b) => a - b)
  const yMin = Math.floor((ys[Math.floor(ys.length * 0.01)] ?? 80) * 2) / 2
  const yMax = Math.ceil((ys[Math.floor(ys.length * 0.99)] ?? 90) * 2) / 2
  const x = (age: number) => PAD.l + (age / maxAge) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b)
  const yTicks = Array.from(
    { length: Math.floor((yMax - yMin) / 0.5) + 1 },
    (_, i) => yMin + i * 0.5,
  ).filter((_, i, a) => a.length <= 8 || i % 2 === 0)
  const xTicks = Array.from({ length: Math.floor(maxAge / 10) + 1 }, (_, i) => i * 10)
  const ref = meta.results[0]?.driver ?? ''
  const lines = Object.entries(model.compounds)
    .filter(([c]) => points.some((p) => p.compound === c))
    .map(([c, m]) => {
      const ages = points.filter((p) => p.compound === c).map((p) => p.age)
      const a0 = Math.min(...ages)
      const a1 = Math.max(...ages)
      const at = (age: number) => predictLap(model, ref, c, age, 1)
      return { compound: c, deg: m!.deg, a0, a1, y0: at(a0), y1: at(a1), labelY: 0 }
    })
  // Direct labels: keep at least 16px apart so close lines stay readable.
  const byEnd = [...lines].sort((p, q) => y(p.y1) - y(q.y1))
  byEnd.forEach((l, i) => {
    const want = y(l.y1)
    const prev = i > 0 ? byEnd[i - 1]!.labelY : -Infinity
    l.labelY = Math.max(want, prev + 16)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <TyreIcon />
          Tyre degradation
        </CardTitle>
        <CardDescription>clean laps, fuel- and driver-corrected</CardDescription>
        <CardAction>
          <SaveImageButton name="Tyre degradation" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full min-w-[480px]"
            role="img"
            aria-label="Lap time against tyre age for each compound"
          >
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
                <text
                  x={PAD.l - 6}
                  y={y(t)}
                  textAnchor="end"
                  dominantBaseline="central"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  fill="var(--faint-foreground)"
                >
                  {t.toFixed(1)}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <text
                key={t}
                x={x(t)}
                y={H - 10}
                textAnchor="middle"
                fontSize="10"
                fontFamily="var(--font-mono)"
                fill="var(--faint-foreground)"
              >
                {t}
              </text>
            ))}
            <text
              x={(PAD.l + W - PAD.r) / 2}
              y={H - 1}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted-foreground)"
            >
              tyre age (laps)
            </text>
            {points.map((p, i) => (
              <circle
                key={i}
                cx={x(p.age)}
                cy={y(clamp(p.y, yMin, yMax))}
                r={2.2}
                fill={compoundColor(p.compound)}
                opacity={0.35}
              />
            ))}
            {lines.map((l) => (
              <g key={l.compound}>
                <line
                  x1={x(l.a0)}
                  x2={x(l.a1)}
                  y1={y(l.y0)}
                  y2={y(l.y1)}
                  stroke="var(--surface-1)"
                  strokeWidth={5}
                  strokeLinecap="round"
                />
                <line
                  x1={x(l.a0)}
                  x2={x(l.a1)}
                  y1={y(l.y0)}
                  y2={y(l.y1)}
                  stroke={compoundColor(l.compound)}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                >
                  <title>{`${compoundName(l.compound)}: +${l.deg.toFixed(3)} s per lap of tyre age`}</title>
                </line>
                <circle
                  cx={x(l.a1)}
                  cy={y(l.y1)}
                  r={4}
                  fill={compoundColor(l.compound)}
                  stroke="var(--surface-1)"
                  strokeWidth={2}
                />
                <line
                  x1={x(l.a1) + 5}
                  x2={W - PAD.r + 6}
                  y1={y(l.y1)}
                  y2={l.labelY}
                  stroke="var(--border)"
                />
                <text
                  x={W - PAD.r + 10}
                  y={l.labelY}
                  dominantBaseline="central"
                  fontSize="11"
                  fill="var(--foreground)"
                >
                  {compoundName(l.compound)}{' '}
                  <tspan fontFamily="var(--font-mono)" fill="var(--muted-foreground)">
                    +{l.deg.toFixed(3)}s/lap
                  </tspan>
                </text>
              </g>
            ))}
          </svg>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-3 border-t pt-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Fuel effect</dt>
            <dd className="numeric text-sm">{model.fuel.toFixed(3)} s/lap</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Pit stop loss</dt>
            <dd className="numeric text-sm">{model.pitLoss.toFixed(1)} s</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Model error (1σ)</dt>
            <dd className="numeric text-sm">±{model.residualSd.toFixed(2)} s/lap</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
