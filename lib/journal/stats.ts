/**
 * Journal analysis — PRD F3.2.
 *
 * The point of a brew log is that something reads it back. These are pure
 * functions over BrewRecord[] so the screen stays dumb and the maths stays
 * tested. `now` is always injected — no clock reads in here.
 */

import { GOLDEN_CUP, controlChartZone } from '@/lib/calc/extraction'
import type { BrewRecord } from '@/lib/db/repository'

const DAY_MS = 86_400_000

export type BrewStats = {
  total: number
  scored: number
  measured: number
  avgScore?: number
  bestScore?: number
  bestBrewId?: string
  totalCoffeeG: number
  totalWaterG: number
  currentStreakDays: number
  longestStreakDays: number
  firstBrewAt?: number
  lastBrewAt?: number
}

/** Local calendar day key, so a 1 a.m. brew counts as that night, not the next day. */
function dayKey(epochMs: number): string {
  const d = new Date(epochMs)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayIndex(epochMs: number): number {
  const d = new Date(epochMs)
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY_MS)
}

export function summarise(brews: BrewRecord[], now: number): BrewStats {
  if (brews.length === 0) {
    return {
      total: 0,
      scored: 0,
      measured: 0,
      totalCoffeeG: 0,
      totalWaterG: 0,
      currentStreakDays: 0,
      longestStreakDays: 0,
    }
  }

  const scored = brews.filter((b) => typeof b.score === 'number')
  const measured = brews.filter((b) => typeof b.eyPct === 'number' && typeof b.tdsPct === 'number')

  let best: BrewRecord | undefined
  for (const b of scored) {
    if (!best || (b.score ?? 0) > (best.score ?? 0)) best = b
  }

  const days = [...new Set(brews.map((b) => dayIndex(b.startedAt)))].sort((a, b) => a - b)

  let longest = 1
  let run = 1
  for (let i = 1; i < days.length; i++) {
    run = days[i]! - days[i - 1]! === 1 ? run + 1 : 1
    if (run > longest) longest = run
  }

  // A streak survives today being empty — it only breaks once yesterday is missed.
  const today = dayIndex(now)
  let current = 0
  const daySet = new Set(days)
  const startsAt = daySet.has(today) ? today : daySet.has(today - 1) ? today - 1 : null
  if (startsAt !== null) {
    let d = startsAt
    while (daySet.has(d)) {
      current++
      d--
    }
  }

  const times = brews.map((b) => b.startedAt)

  return {
    total: brews.length,
    scored: scored.length,
    measured: measured.length,
    avgScore:
      scored.length > 0
        ? scored.reduce((s, b) => s + (b.score ?? 0), 0) / scored.length
        : undefined,
    bestScore: best?.score,
    bestBrewId: best?.id,
    totalCoffeeG: brews.reduce((s, b) => s + b.doseG, 0),
    totalWaterG: brews.reduce((s, b) => s + b.waterG, 0),
    currentStreakDays: current,
    longestStreakDays: days.length === 1 ? 1 : longest,
    firstBrewAt: Math.min(...times),
    lastBrewAt: Math.max(...times),
  }
}

export type ChartPoint = {
  id: string
  eyPct: number
  tdsPct: number
  score?: number
  zone: ReturnType<typeof controlChartZone>
  startedAt: number
}

/** Only brews with both numbers can be plotted. PRD F3 R6. */
export function chartPoints(brews: BrewRecord[]): ChartPoint[] {
  return brews
    .filter(
      (b): b is BrewRecord & { eyPct: number; tdsPct: number } =>
        typeof b.eyPct === 'number' && typeof b.tdsPct === 'number',
    )
    .map((b) => ({
      id: b.id,
      eyPct: b.eyPct,
      tdsPct: b.tdsPct,
      score: b.score,
      zone: controlChartZone(b.eyPct, b.tdsPct),
      startedAt: b.startedAt,
    }))
}

/** Minimum scored, measured brews before a personal preference zone means anything. */
export const MIN_POINTS_FOR_CENTROID = 8

/**
 * Where this user's good cups actually cluster — score-weighted, so a strong
 * brew pulls harder than a mediocre one. Null until there is enough evidence
 * to say anything (PRD F3 R6).
 */
export function preferenceCentroid(
  points: ChartPoint[],
): { eyPct: number; tdsPct: number; from: number } | null {
  const usable = points.filter((p) => typeof p.score === 'number' && p.score > 0)
  if (usable.length < MIN_POINTS_FOR_CENTROID) return null

  // Weight by score above the midpoint so bad brews do not drag the centre.
  const weighted = usable.map((p) => ({ p, w: Math.max(0.1, (p.score ?? 0) - 5) }))
  const total = weighted.reduce((s, x) => s + x.w, 0)
  return {
    eyPct: weighted.reduce((s, x) => s + x.p.eyPct * x.w, 0) / total,
    tdsPct: weighted.reduce((s, x) => s + x.p.tdsPct * x.w, 0) / total,
    from: usable.length,
  }
}

export type RecipeBreakdown = {
  recipeId: string
  count: number
  avgScore?: number
  bestScore?: number
}

/** Which recipes actually work for this user. PRD F3 R5, as far as the data allows. */
export function byRecipe(brews: BrewRecord[]): RecipeBreakdown[] {
  const groups = new Map<string, BrewRecord[]>()
  for (const b of brews) {
    const key = b.recipeId ?? 'ad-hoc'
    const list = groups.get(key) ?? []
    list.push(b)
    groups.set(key, list)
  }

  return [...groups.entries()]
    .map(([recipeId, list]) => {
      const scored = list.filter((b) => typeof b.score === 'number')
      return {
        recipeId,
        count: list.length,
        avgScore:
          scored.length > 0
            ? scored.reduce((s, b) => s + (b.score ?? 0), 0) / scored.length
            : undefined,
        bestScore: scored.length > 0 ? Math.max(...scored.map((b) => b.score ?? 0)) : undefined,
      }
    })
    .sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1) || b.count - a.count)
}

export type Filters = {
  text?: string
  recipeId?: string
  minScore?: number
  measuredOnly?: boolean
}

/** PRD F3 R8. Text matches notes, tags, and the recipe id. */
export function filterBrews(brews: BrewRecord[], f: Filters): BrewRecord[] {
  const needle = f.text?.trim().toLowerCase()
  return brews.filter((b) => {
    if (f.recipeId && (b.recipeId ?? 'ad-hoc') !== f.recipeId) return false
    if (f.minScore !== undefined && (b.score ?? 0) < f.minScore) return false
    if (f.measuredOnly && typeof b.eyPct !== 'number') return false
    if (needle) {
      const hay = [b.notes ?? '', (b.tags ?? []).join(' '), b.recipeId ?? '']
        .join(' ')
        .toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })
}

/** Newest first — the order a journal is actually read in. */
export function sortByNewest(brews: BrewRecord[]): BrewRecord[] {
  return [...brews].sort((a, b) => b.startedAt - a.startedAt)
}

/** Plain-language read on where a brew landed, reused by the chart legend. */
export function describeZone(zone: ChartPoint['zone']): string {
  switch (zone) {
    case 'ideal':
      return 'In the Golden Cup box'
    case 'under':
      return 'Under-extracted'
    case 'over':
      return 'Over-extracted'
    case 'weak':
      return 'Weak, but well extracted'
    case 'strong':
      return 'Strong, but well extracted'
    case 'under-weak':
      return 'Under-extracted and weak'
    case 'under-strong':
      return 'Under-extracted and strong'
    case 'over-weak':
      return 'Over-extracted and weak'
    case 'over-strong':
      return 'Over-extracted and strong'
  }
}

export { GOLDEN_CUP }
