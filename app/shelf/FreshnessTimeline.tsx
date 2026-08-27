'use client'

import { FRESHNESS_WINDOWS, type RoastLevel } from '@/lib/calc/freshness'
import type { TimelinePoint } from '@/lib/shelf/bean'

/**
 * Score against days off roast for one bag — PRD F3 R4.
 *
 * The generic degassing windows are drawn as bands behind the user's own scores,
 * so the comparison the PRD actually asks for is visible: does this bag peak
 * where the chart says it should, or where you say it does?
 */

const W = 320
const H = 180
const PAD = { top: 12, right: 12, bottom: 30, left: 30 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const BANDS: { key: string; label: string; opacity: number }[] = [
  { key: 'resting', label: 'resting', opacity: 0.05 },
  { key: 'peak', label: 'peak', opacity: 0.16 },
  { key: 'good', label: 'good', opacity: 0.08 },
  { key: 'fading', label: 'fading', opacity: 0.03 },
]

export function FreshnessTimeline({
  roastLevel,
  points,
  currentDay,
  personalPeak,
}: {
  roastLevel: RoastLevel
  points: TimelinePoint[]
  currentDay?: number
  /** The user's own shifted window, when there is enough data for one. */
  personalPeak?: { peakStart: number; peakEnd: number }
}) {
  const w = FRESHNESS_WINDOWS[roastLevel]

  // Always show the whole generic curve, plus anything logged beyond it.
  const maxDay = Math.max(w.fadingUntil, currentDay ?? 0, ...points.map((p) => p.daysOffRoast)) + 2

  const x = (day: number) => PAD.left + (Math.max(0, day) / maxDay) * PLOT_W
  const y = (score: number) => PAD.top + (1 - (score - 1) / 9) * PLOT_H

  const bandRanges: Record<string, [number, number]> = {
    resting: [0, w.peakStart],
    peak: [w.peakStart, w.peakEnd],
    good: [w.peakEnd, w.goodUntil],
    fading: [w.goodUntil, w.fadingUntil],
  }

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Score against days off roast for this bag, with ${points.length} scored brews plotted.`}
      >
        <title>Freshness timeline</title>

        {BANDS.map((band) => {
          const [from, to] = bandRanges[band.key]!
          return (
            <g key={band.key}>
              <rect
                x={x(from)}
                y={PAD.top}
                width={Math.max(0, x(to) - x(from))}
                height={PLOT_H}
                fill="var(--color-accent)"
                fillOpacity={band.opacity}
              />
              <text
                x={x(from) + (x(to) - x(from)) / 2}
                y={PAD.top + 9}
                textAnchor="middle"
                fontSize={7}
                fill="var(--color-faint)"
              >
                {x(to) - x(from) > 26 ? band.label : ''}
              </text>
            </g>
          )
        })}

        {/* Score gridlines */}
        {[3, 5, 7, 9].map((s) => (
          <g key={s}>
            <line
              x1={PAD.left}
              y1={y(s)}
              x2={PAD.left + PLOT_W}
              y2={y(s)}
              stroke="var(--color-line)"
            />
            <text
              x={PAD.left - 5}
              y={y(s) + 3}
              textAnchor="end"
              fontSize={8}
              fill="var(--color-faint)"
            >
              {s}
            </text>
          </g>
        ))}

        {/* The user's own peak window, when it differs from the generic one. */}
        {personalPeak && (
          <rect
            x={x(personalPeak.peakStart)}
            y={PAD.top}
            width={Math.max(0, x(personalPeak.peakEnd) - x(personalPeak.peakStart))}
            height={PLOT_H}
            fill="none"
            stroke="var(--color-accent)"
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
        )}

        {/* Where this bag is right now */}
        {currentDay !== undefined && (
          <>
            <line
              x1={x(currentDay)}
              y1={PAD.top}
              x2={x(currentDay)}
              y2={PAD.top + PLOT_H}
              stroke="var(--color-ink)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <text
              x={x(currentDay)}
              y={PAD.top + PLOT_H + 20}
              textAnchor="middle"
              fontSize={8}
              fill="var(--color-ink)"
            >
              today
            </text>
          </>
        )}

        {/* Axes */}
        <line
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={PAD.left + PLOT_W}
          y2={PAD.top + PLOT_H}
          stroke="var(--color-line-strong)"
        />

        {/* Trend line through the user's scores */}
        {points.length > 1 && (
          <polyline
            points={points.map((p) => `${x(p.daysOffRoast)},${y(p.score)}`).join(' ')}
            fill="none"
            stroke="var(--color-accent)"
            strokeOpacity={0.4}
            strokeWidth={1.5}
          />
        )}

        {points.map((p) => (
          <circle
            key={p.brewId}
            cx={x(p.daysOffRoast)}
            cy={y(p.score)}
            r={4}
            fill="var(--color-accent)"
          >
            <title>{`Day ${p.daysOffRoast}, scored ${p.score}`}</title>
          </circle>
        ))}

        {[0, Math.round(maxDay / 2), Math.round(maxDay)].map((d) => (
          <text
            key={`t${d}`}
            x={x(d)}
            y={PAD.top + PLOT_H + 11}
            textAnchor="middle"
            fontSize={8}
            fill="var(--color-faint)"
          >
            {d}
          </text>
        ))}
        <text
          x={PAD.left + PLOT_W}
          y={PAD.top + PLOT_H + 11}
          textAnchor="end"
          fontSize={8}
          fill="var(--color-muted)"
        >
          days off roast
        </text>
      </svg>

      <figcaption className="mt-2 text-sm text-[var(--color-faint)]">
        {points.length === 0 ? (
          <>
            Score a few brews from this bag and your own peak window appears here, next to the
            generic one.
          </>
        ) : personalPeak ? (
          <>
            Your scores put this bag's window at day {Math.round(personalPeak.peakStart)}–
            {Math.round(personalPeak.peakEnd)}, drawn dashed. The shaded bands are the generic curve
            for a {roastLevel === 'veryLight' ? 'very light' : roastLevel} roast.
          </>
        ) : (
          <>
            {points.length} scored brew{points.length === 1 ? '' : 's'} so far. The bands are the
            generic degassing curve — six scored brews and the app switches to your own.
          </>
        )}
      </figcaption>
    </figure>
  )
}
