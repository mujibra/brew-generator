'use client'

import { GOLDEN_CUP } from '@/lib/calc/extraction'
import type { ChartPoint } from '@/lib/journal/stats'
import { preferenceCentroid } from '@/lib/journal/stats'

/**
 * The brew control chart — PRD F3 R6.
 *
 * Strength (TDS %) against extraction yield (%), with the SCA Golden Cup box
 * drawn and the user's own preference centre once there is enough evidence.
 *
 * ponytail: hand-rolled SVG. This is a scatter plot inside a rectangle — a
 * charting library would be more code than the chart. Revisit if a third chart
 * type shows up.
 */

const W = 320
const H = 240
const PAD = { top: 14, right: 14, bottom: 34, left: 46 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom

const EY_RANGE = { min: 14, max: 26 }
const TDS_RANGE = { min: 0.8, max: 1.7 }

const x = (ey: number) =>
  PAD.left + ((clamp(ey, EY_RANGE) - EY_RANGE.min) / (EY_RANGE.max - EY_RANGE.min)) * PLOT_W
const y = (tds: number) =>
  PAD.top + (1 - (clamp(tds, TDS_RANGE) - TDS_RANGE.min) / (TDS_RANGE.max - TDS_RANGE.min)) * PLOT_H

function clamp(v: number, r: { min: number; max: number }) {
  return Math.min(r.max, Math.max(r.min, v))
}

export function ControlChart({
  points,
  selectedId,
  onSelect,
}: {
  points: ChartPoint[]
  selectedId?: string
  onSelect?: (id: string) => void
}) {
  const centroid = preferenceCentroid(points)

  const boxX = x(GOLDEN_CUP.ey.min)
  const boxY = y(GOLDEN_CUP.tds.max)
  const boxW = x(GOLDEN_CUP.ey.max) - boxX
  const boxH = y(GOLDEN_CUP.tds.min) - boxY

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Brew control chart with ${points.length} plotted brews. Extraction yield on the horizontal axis, strength on the vertical.`}
      >
        <title>Brew control chart</title>

        {/* Gridlines */}
        {[16, 18, 20, 22, 24].map((ey) => (
          <line
            key={`gx${ey}`}
            x1={x(ey)}
            y1={PAD.top}
            x2={x(ey)}
            y2={PAD.top + PLOT_H}
            stroke="var(--color-line)"
            strokeWidth={1}
          />
        ))}
        {[0.9, 1.1, 1.3, 1.5].map((tds) => (
          <line
            key={`gy${tds}`}
            x1={PAD.left}
            y1={y(tds)}
            x2={PAD.left + PLOT_W}
            y2={y(tds)}
            stroke="var(--color-line)"
            strokeWidth={1}
          />
        ))}

        {/* Golden Cup box */}
        <rect
          x={boxX}
          y={boxY}
          width={boxW}
          height={boxH}
          fill="var(--color-good)"
          fillOpacity={0.35}
          stroke="var(--color-good-ink)"
          strokeOpacity={0.6}
          strokeWidth={1}
          rx={2}
        />
        <text
          x={boxX + 3}
          y={boxY - 5}
          textAnchor="start"
          fontSize={8}
          fontWeight={600}
          letterSpacing={0.4}
          fill="var(--color-good-ink)"
        >
          GOLDEN CUP
        </text>

        {/* Axes */}
        <line
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={PAD.left + PLOT_W}
          y2={PAD.top + PLOT_H}
          stroke="var(--color-line-strong)"
        />
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + PLOT_H}
          stroke="var(--color-line-strong)"
        />

        {[16, 18, 20, 22, 24].map((ey) => (
          <text
            key={`lx${ey}`}
            x={x(ey)}
            y={PAD.top + PLOT_H + 13}
            textAnchor="middle"
            fontSize={9}
            fill="var(--color-faint)"
          >
            {ey}
          </text>
        ))}
        {[0.9, 1.1, 1.3, 1.5].map((tds) => (
          <text
            key={`ly${tds}`}
            x={PAD.left - 6}
            y={y(tds) + 3}
            textAnchor="end"
            fontSize={9}
            fill="var(--color-faint)"
          >
            {tds.toFixed(1)}
          </text>
        ))}

        <text
          x={PAD.left + PLOT_W / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize={9}
          fill="var(--color-muted)"
        >
          Extraction yield %
        </text>
        <text
          x={12}
          y={PAD.top + PLOT_H / 2}
          textAnchor="middle"
          fontSize={9}
          fill="var(--color-muted)"
          transform={`rotate(-90 12 ${PAD.top + PLOT_H / 2})`}
        >
          Strength, TDS %
        </text>

        {/* The user's own preference centre, drawn under the points. */}
        {centroid && (
          <>
            <circle
              cx={x(centroid.eyPct)}
              cy={y(centroid.tdsPct)}
              r={16}
              fill="var(--color-accent)"
              fillOpacity={0.1}
              stroke="var(--color-accent)"
              strokeDasharray="3 2"
              strokeOpacity={0.7}
            />
            <text
              x={x(centroid.eyPct)}
              y={y(centroid.tdsPct) - 22}
              textAnchor="middle"
              fontSize={8}
              fontWeight={700}
              letterSpacing={0.4}
              fill="var(--color-accent)"
            >
              YOUR ZONE
            </text>
          </>
        )}

        {/* Brews */}
        {points.map((p) => {
          const selected = p.id === selectedId
          return (
            // biome-ignore lint/a11y/useKeyWithClickEvents: a shortcut, not the only path — the brew list below the chart reaches every point by keyboard.
            <circle
              key={p.id}
              cx={x(p.eyPct)}
              cy={y(p.tdsPct)}
              r={selected ? 6 : 4}
              fill={p.zone === 'ideal' ? 'var(--color-good-ink)' : 'var(--color-muted)'}
              stroke={selected ? 'var(--color-ink)' : 'none'}
              strokeWidth={2}
              opacity={selected ? 1 : 0.85}
              style={onSelect ? { cursor: 'pointer' } : undefined}
              onClick={onSelect ? () => onSelect(p.id) : undefined}
            >
              <title>{`${p.eyPct.toFixed(1)} % EY, ${p.tdsPct.toFixed(2)} % TDS${p.score ? `, scored ${p.score}` : ''}`}</title>
            </circle>
          )
        })}
      </svg>

      <figcaption className="mt-2 text-sm text-[var(--color-faint)]">
        {centroid ? (
          <>
            Your good cups cluster around {centroid.eyPct.toFixed(1)} % extraction at{' '}
            {centroid.tdsPct.toFixed(2)} % strength, from {centroid.from} scored brews.
          </>
        ) : (
          <>
            Log {8 - points.filter((p) => p.score).length} more scored brews with a TDS reading and
            the chart will show where your own preference sits.
          </>
        )}
      </figcaption>
    </figure>
  )
}
