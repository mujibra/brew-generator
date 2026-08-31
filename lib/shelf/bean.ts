/**
 * Bean shelf logic — PRD F5.
 *
 * The bag is the anchor (PRD 5.3): recipes attach to beans, brews attach to
 * both. Everything here is pure, with `now` injected, so the freshness model
 * stays testable.
 */

import {
  type FreshnessAssessment,
  type RoastLevel,
  assessFreshness,
  daysOffRoast,
} from '@/lib/calc/freshness'
import type { BeanRecord, BrewRecord } from '@/lib/db/repository'
import type { GenerateInput } from '@/lib/recipes/generate'
import { type ProcessId, processFromText } from '@/lib/recipes/process'

export const ROAST_LEVELS: { id: RoastLevel; label: string }[] = [
  { id: 'veryLight', label: 'Very light' },
  { id: 'light', label: 'Light' },
  { id: 'mediumLight', label: 'Medium-light' },
  { id: 'medium', label: 'Medium' },
  { id: 'mediumDark', label: 'Medium-dark' },
  { id: 'dark', label: 'Dark' },
]

export const roastLabel = (r?: RoastLevel) =>
  ROAST_LEVELS.find((x) => x.id === r)?.label ?? 'Unknown roast'

/** Days off roast, or undefined when the bag never said. */
export function beanAge(bean: BeanRecord, now: number): number | undefined {
  if (!bean.roastDate) return undefined
  const d = new Date(bean.roastDate)
  if (Number.isNaN(d.getTime())) return undefined
  return daysOffRoast(d, new Date(now))
}

/**
 * Freshness for this bag, blended with the user's own scores on it once there
 * are enough (PRD 9.4). Null when the roast date or level is missing — we do
 * not guess at the one number the whole model hangs on.
 */
export function beanFreshness(
  bean: BeanRecord,
  brews: BrewRecord[],
  now: number,
): FreshnessAssessment | null {
  const age = beanAge(bean, now)
  if (age === undefined || !bean.roastLevel) return null

  const history = brews
    .filter((b) => b.beanId === bean.id && typeof b.score === 'number')
    .map((b) => ({
      daysOffRoast:
        b.daysOffRoast ?? daysOffRoast(new Date(bean.roastDate!), new Date(b.startedAt)),
      score: b.score ?? 0,
    }))

  return assessFreshness({ roastLevel: bean.roastLevel, daysOffRoast: age, history })
}

/** PRD F5 R4 — "you have 3 brews left". */
export function brewsLeft(bean: BeanRecord, doseG: number): number {
  if (doseG <= 0) return 0
  return Math.floor(bean.remainingG / doseG)
}

export const LOW_STOCK_BREWS = 2

export function isLowStock(bean: BeanRecord, doseG: number): boolean {
  return !bean.archived && bean.remainingG > 0 && brewsLeft(bean, doseG) <= LOW_STOCK_BREWS
}

/**
 * Decrement the bag after a brew. Never goes negative, and reports when the
 * brew asked for more than was there (PRD F5.3) — a warning, not a block.
 */
export function consumeDose(
  bean: BeanRecord,
  doseG: number,
): { bean: BeanRecord; shortfallG: number } {
  if (doseG < 0) throw new RangeError('dose must be >= 0')
  const shortfallG = Math.max(0, doseG - bean.remainingG)
  return {
    bean: { ...bean, remainingG: Math.max(0, bean.remainingG - doseG) },
    shortfallG,
  }
}

/** What the generator can learn from the bag (PRD F5, feeding the builder). */
export function beanToGenerateInput(
  bean: BeanRecord,
  now: number,
): Pick<GenerateInput, 'roastLevel' | 'altitudeMasl' | 'daysOffRoast' | 'processId'> {
  const age = beanAge(bean, now)
  // The bag's process is free text — "Natural Anaerobic", "Red Honey" — so it
  // is read rather than required to have come from a dropdown.
  const processId = (bean.processId as ProcessId | undefined) ?? processFromText(bean.process)
  return {
    ...(bean.roastLevel ? { roastLevel: bean.roastLevel } : {}),
    ...(bean.altitudeMasl !== undefined ? { altitudeMasl: bean.altitudeMasl } : {}),
    ...(age !== undefined ? { daysOffRoast: age } : {}),
    ...(processId ? { processId } : {}),
  } as Pick<GenerateInput, 'roastLevel' | 'altitudeMasl' | 'daysOffRoast' | 'processId'>
}

export type TimelinePoint = { daysOffRoast: number; score: number; brewId: string }

/**
 * Score against days off roast for one bag — PRD F3 R4.
 *
 * This is the view that shows a user their own peak window rather than a
 * chart's, so it only ever plots brews that actually have both numbers.
 */
export function beanTimeline(bean: BeanRecord, brews: BrewRecord[]): TimelinePoint[] {
  if (!bean.roastDate) return []
  const roast = new Date(bean.roastDate)
  if (Number.isNaN(roast.getTime())) return []

  return brews
    .filter((b) => b.beanId === bean.id && typeof b.score === 'number')
    .map((b) => ({
      daysOffRoast: b.daysOffRoast ?? daysOffRoast(roast, new Date(b.startedAt)),
      score: b.score ?? 0,
      brewId: b.id,
    }))
    .sort((a, b) => a.daysOffRoast - b.daysOffRoast)
}

export type ShelfSummary = {
  active: BeanRecord[]
  archived: BeanRecord[]
  totalRemainingG: number
  lowStock: BeanRecord[]
}

/** Freshest-first among what is actually drinkable, so the shelf reads usefully. */
export function summariseShelf(
  beans: BeanRecord[],
  now: number,
  typicalDoseG: number,
): ShelfSummary {
  const active = beans
    .filter((b) => !b.archived)
    .sort((a, b) => {
      const ageA = beanAge(a, now) ?? Number.POSITIVE_INFINITY
      const ageB = beanAge(b, now) ?? Number.POSITIVE_INFINITY
      return ageA - ageB
    })

  return {
    active,
    archived: beans.filter((b) => b.archived),
    totalRemainingG: active.reduce((s, b) => s + b.remainingG, 0),
    lowStock: active.filter((b) => isLowStock(b, typicalDoseG)),
  }
}

/** Sensible blank bag. Only a name is genuinely required (PRD F5.3). */
export function emptyBean(id: string, now: number): BeanRecord {
  return {
    id,
    updatedAt: now,
    name: '',
    roaster: '',
    sizeG: 250,
    remainingG: 250,
  }
}
