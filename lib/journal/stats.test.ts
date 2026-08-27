import type { BrewRecord } from '@/lib/db/repository'
import { describe, expect, it } from 'vitest'
import { exportFilename, toCsv, toJson } from './export'
import {
  MIN_POINTS_FOR_CENTROID,
  byRecipe,
  chartPoints,
  describeZone,
  filterBrews,
  preferenceCentroid,
  sortByNewest,
  summarise,
} from './stats'

const DAY = 86_400_000
/** A fixed noon so day-boundary maths is unambiguous in any timezone. */
const NOON = new Date(2026, 7, 20, 12, 0, 0).getTime()

function brew(over: Partial<BrewRecord> = {}): BrewRecord {
  return {
    id: over.id ?? `b${Math.random()}`,
    updatedAt: 0,
    startedAt: NOON,
    doseG: 20,
    waterG: 320,
    totalTimeS: 210,
    ...over,
  }
}

describe('summarise', () => {
  it('handles an empty journal without pretending', () => {
    const s = summarise([], NOON)
    expect(s.total).toBe(0)
    expect(s.avgScore).toBeUndefined()
    expect(s.currentStreakDays).toBe(0)
    expect(s.firstBrewAt).toBeUndefined()
  })

  it('totals coffee and water across every brew', () => {
    const s = summarise([brew(), brew({ doseG: 30, waterG: 500 })], NOON)
    expect(s.total).toBe(2)
    expect(s.totalCoffeeG).toBe(50)
    expect(s.totalWaterG).toBe(820)
  })

  it('averages only the scored brews', () => {
    const s = summarise([brew({ score: 8 }), brew({ score: 6 }), brew()], NOON)
    expect(s.total).toBe(3)
    expect(s.scored).toBe(2)
    expect(s.avgScore).toBe(7)
  })

  it('finds the best brew', () => {
    const s = summarise([brew({ id: 'a', score: 6 }), brew({ id: 'b', score: 9 })], NOON)
    expect(s.bestScore).toBe(9)
    expect(s.bestBrewId).toBe('b')
  })

  it('counts brews that carry both TDS and EY as measured', () => {
    const s = summarise([brew({ tdsPct: 1.3, eyPct: 20 }), brew({ tdsPct: 1.3 }), brew()], NOON)
    expect(s.measured).toBe(1)
  })

  describe('streaks', () => {
    it('counts consecutive days ending today', () => {
      const s = summarise(
        [
          brew({ startedAt: NOON }),
          brew({ startedAt: NOON - DAY }),
          brew({ startedAt: NOON - 2 * DAY }),
        ],
        NOON,
      )
      expect(s.currentStreakDays).toBe(3)
    })

    it('survives an empty today if yesterday counted', () => {
      const s = summarise(
        [brew({ startedAt: NOON - DAY }), brew({ startedAt: NOON - 2 * DAY })],
        NOON,
      )
      expect(s.currentStreakDays).toBe(2)
    })

    it('breaks once two days are missed', () => {
      const s = summarise(
        [brew({ startedAt: NOON - 2 * DAY }), brew({ startedAt: NOON - 3 * DAY })],
        NOON,
      )
      expect(s.currentStreakDays).toBe(0)
    })

    it('counts several brews on one day as a single day', () => {
      const s = summarise([brew(), brew(), brew()], NOON)
      expect(s.currentStreakDays).toBe(1)
      expect(s.longestStreakDays).toBe(1)
    })

    it('reports the longest run even when it is in the past', () => {
      const s = summarise(
        [
          brew({ startedAt: NOON - 10 * DAY }),
          brew({ startedAt: NOON - 9 * DAY }),
          brew({ startedAt: NOON - 8 * DAY }),
          brew({ startedAt: NOON - 7 * DAY }),
          brew({ startedAt: NOON }),
        ],
        NOON,
      )
      expect(s.longestStreakDays).toBe(4)
      expect(s.currentStreakDays).toBe(1)
    })
  })
})

describe('chartPoints', () => {
  it('plots only brews with both numbers', () => {
    const points = chartPoints([
      brew({ id: 'full', tdsPct: 1.3, eyPct: 20 }),
      brew({ id: 'tds-only', tdsPct: 1.3 }),
      brew({ id: 'neither' }),
    ])
    expect(points.map((p) => p.id)).toEqual(['full'])
  })

  it('classifies each point against the Golden Cup box', () => {
    const points = chartPoints([
      brew({ id: 'a', tdsPct: 1.25, eyPct: 20 }),
      brew({ id: 'b', tdsPct: 0.9, eyPct: 15 }),
    ])
    expect(points[0]!.zone).toBe('ideal')
    expect(points[1]!.zone).toBe('under-weak')
  })
})

describe('preferenceCentroid', () => {
  const measured = (ey: number, tds: number, score: number, id: string) =>
    brew({ id, eyPct: ey, tdsPct: tds, score })

  it('says nothing until there is enough evidence', () => {
    const points = chartPoints(
      Array.from({ length: MIN_POINTS_FOR_CENTROID - 1 }, (_, i) => measured(20, 1.3, 8, `b${i}`)),
    )
    expect(preferenceCentroid(points)).toBeNull()
  })

  it('reports a centre once there is', () => {
    const points = chartPoints(
      Array.from({ length: MIN_POINTS_FOR_CENTROID }, (_, i) => measured(20, 1.3, 8, `b${i}`)),
    )
    const c = preferenceCentroid(points)
    expect(c?.eyPct).toBeCloseTo(20, 6)
    expect(c?.tdsPct).toBeCloseTo(1.3, 6)
    expect(c?.from).toBe(MIN_POINTS_FOR_CENTROID)
  })

  it('is pulled towards the high-scoring brews, not the average of all', () => {
    // Four great brews at EY 21, four mediocre ones at EY 17.
    const points = chartPoints([
      ...Array.from({ length: 4 }, (_, i) => measured(21, 1.3, 9, `good${i}`)),
      ...Array.from({ length: 4 }, (_, i) => measured(17, 1.1, 6, `meh${i}`)),
    ])
    const c = preferenceCentroid(points)!
    expect(c.eyPct).toBeGreaterThan(19) // plain mean would be 19
  })

  it('ignores unscored brews', () => {
    const points = chartPoints(
      Array.from({ length: MIN_POINTS_FOR_CENTROID }, (_, i) =>
        brew({ id: `b${i}`, eyPct: 20, tdsPct: 1.3 }),
      ),
    )
    expect(preferenceCentroid(points)).toBeNull()
  })
})

describe('byRecipe', () => {
  it('groups and ranks by average score', () => {
    const rows = byRecipe([
      brew({ recipeId: 'v60-ultimate', score: 9 }),
      brew({ recipeId: 'v60-ultimate', score: 7 }),
      brew({ recipeId: 'aeropress-standard', score: 5 }),
    ])
    expect(rows[0]!.recipeId).toBe('v60-ultimate')
    expect(rows[0]!.count).toBe(2)
    expect(rows[0]!.avgScore).toBe(8)
    expect(rows[0]!.bestScore).toBe(9)
    expect(rows[1]!.recipeId).toBe('aeropress-standard')
  })

  it('buckets brews with no recipe as ad-hoc', () => {
    expect(byRecipe([brew()])[0]!.recipeId).toBe('ad-hoc')
  })
})

describe('filterBrews', () => {
  const data = [
    brew({ id: 'a', recipeId: 'v60-ultimate', score: 9, tags: ['sweet'], notes: 'blackcurrant' }),
    brew({ id: 'b', recipeId: 'aeropress-standard', score: 4, tags: ['sour'], notes: '' }),
    brew({ id: 'c', recipeId: 'v60-ultimate', score: 7, tdsPct: 1.3, eyPct: 20 }),
  ]

  it('returns everything with no filters', () => {
    expect(filterBrews(data, {})).toHaveLength(3)
  })

  it('matches text across notes, tags and recipe', () => {
    expect(filterBrews(data, { text: 'blackcurrant' }).map((b) => b.id)).toEqual(['a'])
    expect(filterBrews(data, { text: 'sour' }).map((b) => b.id)).toEqual(['b'])
    expect(filterBrews(data, { text: 'aeropress' }).map((b) => b.id)).toEqual(['b'])
  })

  it('is case insensitive and ignores surrounding space', () => {
    expect(filterBrews(data, { text: '  BLACKCURRANT ' }).map((b) => b.id)).toEqual(['a'])
  })

  it('filters by recipe, minimum score, and measured-only', () => {
    expect(filterBrews(data, { recipeId: 'v60-ultimate' })).toHaveLength(2)
    expect(filterBrews(data, { minScore: 7 }).map((b) => b.id)).toEqual(['a', 'c'])
    expect(filterBrews(data, { measuredOnly: true }).map((b) => b.id)).toEqual(['c'])
  })

  it('combines filters', () => {
    expect(filterBrews(data, { recipeId: 'v60-ultimate', minScore: 8 }).map((b) => b.id)).toEqual([
      'a',
    ])
  })
})

describe('sortByNewest', () => {
  it('puts the most recent brew first and does not mutate', () => {
    const data = [brew({ id: 'old', startedAt: 1 }), brew({ id: 'new', startedAt: 2 })]
    expect(sortByNewest(data).map((b) => b.id)).toEqual(['new', 'old'])
    expect(data[0]!.id).toBe('old')
  })
})

describe('describeZone', () => {
  it('gives every zone a plain-language reading', () => {
    for (const z of [
      'ideal',
      'under',
      'over',
      'weak',
      'strong',
      'under-weak',
      'under-strong',
      'over-weak',
      'over-strong',
    ] as const) {
      expect(describeZone(z), z).toBeTruthy()
    }
  })
})

describe('csv export', () => {
  it('writes a header even with no rows', () => {
    expect(toCsv([])).toMatch(/^id,startedAt,date,recipeId/)
  })

  it('writes one row per brew with a computed ratio', () => {
    const csv = toCsv([brew({ id: 'x', doseG: 20, waterG: 320, score: 8 })])
    const rows = csv.trim().split('\r\n')
    expect(rows).toHaveLength(2)
    expect(rows[1]).toContain('x,')
    expect(rows[1]).toContain(',16,') // 320 / 20
  })

  it('escapes commas, quotes and newlines in notes', () => {
    const csv = toCsv([brew({ notes: 'sweet, then bitter' })])
    expect(csv).toContain('"sweet, then bitter"')

    const quoted = toCsv([brew({ notes: 'tastes "off"' })])
    expect(quoted).toContain('"tastes ""off"""')

    const multiline = toCsv([brew({ notes: 'line one\nline two' })])
    expect(multiline).toContain('"line one\nline two"')
  })

  it('leaves missing values empty rather than writing undefined', () => {
    const csv = toCsv([brew()])
    expect(csv).not.toContain('undefined')
    expect(csv).not.toContain('null')
  })

  it('joins tags with a space', () => {
    expect(toCsv([brew({ tags: ['sweet', 'clean'] })])).toContain('sweet clean')
  })
})

describe('json export', () => {
  it('round-trips the records', () => {
    const data = [brew({ id: 'a', score: 8 })]
    const parsed = JSON.parse(toJson(data))
    expect(parsed.version).toBe(1)
    expect(parsed.brews).toEqual(data)
  })
})

describe('exportFilename', () => {
  it('stamps the local date and pads the month and day', () => {
    expect(exportFilename('csv', new Date(2026, 0, 5, 12).getTime())).toBe(
      'extraction-journal-2026-01-05.csv',
    )
    expect(exportFilename('json', NOON)).toBe('extraction-journal-2026-08-20.json')
  })
})
