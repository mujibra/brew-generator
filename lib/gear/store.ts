/**
 * Gear settings — PRD F6 R3, F4 R3.
 *
 * Two things the app has to remember for its own advice to be worth anything:
 * which grinder you own and what your baseline setting is on it, and which
 * dial-in suggestion you are currently testing.
 *
 * Pure functions over the record; the screens do the I/O.
 */

import type { BrewRecord, SettingsRecord } from '@/lib/db/repository'
import { type Grinder, grinderById } from '@/lib/grinders/registry'
import type { BrewerId } from '@/lib/recipes/brewers'

export const GEAR_ID = 'gear' as const

export function emptyGear(now: number): SettingsRecord {
  return { id: GEAR_ID, updatedAt: now, baselines: {} }
}

export function grinderOf(gear: SettingsRecord | undefined): Grinder | undefined {
  return gear?.grinderId ? grinderById(gear.grinderId) : undefined
}

/** The user's own setting for this brewer, if they have recorded one. */
export function baselineFor(
  gear: SettingsRecord | undefined,
  brewerId: BrewerId,
): number | undefined {
  return gear?.baselines?.[brewerId]
}

export function setBaseline(
  gear: SettingsRecord,
  brewerId: BrewerId,
  setting: number | undefined,
): SettingsRecord {
  const baselines = { ...(gear.baselines ?? {}) }
  if (setting === undefined || !Number.isFinite(setting)) delete baselines[brewerId]
  else baselines[brewerId] = setting
  return { ...gear, baselines }
}

/** Changing grinder invalidates every baseline — they were in the old one's units. */
export function setGrinder(gear: SettingsRecord, grinderId: string | undefined): SettingsRecord {
  if (gear.grinderId === grinderId) return gear
  return {
    ...gear,
    ...(grinderId ? { grinderId } : {}),
    ...(grinderId ? {} : { grinderId: undefined }),
    baselines: {},
  }
}

export function baselineCount(gear: SettingsRecord | undefined): number {
  return Object.keys(gear?.baselines ?? {}).length
}

// --- The dial-in confirm loop (PRD F4 R3)

export function setPending(
  gear: SettingsRecord,
  hypothesisId: string,
  action: string,
  now: number,
): SettingsRecord {
  return { ...gear, pendingHypothesis: { id: hypothesisId, action, setAt: now } }
}

export function clearPending(gear: SettingsRecord): SettingsRecord {
  const { pendingHypothesis, ...rest } = gear
  return rest as SettingsRecord
}

export type Attempt = { hypothesis: string; outcome: 'better' | 'worse' | 'same' }

/**
 * Attempt history, derived from the journal rather than stored separately.
 *
 * The brews already carry `dialInHypothesis` and `dialInOutcome`, so the log IS
 * the memory — which also means deleting a brew correctly forgets its verdict.
 * Oldest first, because the engine reads the trailing run.
 */
export function attemptsFromBrews(brews: BrewRecord[]): Attempt[] {
  return brews
    .filter(
      (b): b is BrewRecord & { dialInHypothesis: string; dialInOutcome: Attempt['outcome'] } =>
        typeof b.dialInHypothesis === 'string' && b.dialInOutcome !== undefined,
    )
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((b) => ({ hypothesis: b.dialInHypothesis, outcome: b.dialInOutcome }))
}

/**
 * Evidence the app can infer from the last brew, so the user is not retyping
 * what the journal already knows.
 */
export function drawdownFromBrew(
  brew: BrewRecord | undefined,
  expectedTimeS: number | undefined,
): 'fast' | 'normal' | 'slow' | 'stalled' | undefined {
  if (!brew || !expectedTimeS || expectedTimeS <= 0) return undefined
  const ratio = brew.totalTimeS / expectedTimeS
  if (ratio <= 0.75) return 'fast'
  if (ratio >= 1.6) return 'stalled'
  if (ratio >= 1.2) return 'slow'
  return 'normal'
}

/**
 * Tags the log already carries, mapped to the symptom the dial-in asks about.
 *
 * Only the faults map — "sweet" and "balanced" are not complaints, so a brew
 * tagged only with those yields nothing to diagnose. Order matters: the first
 * match wins, and the strongest signals come first.
 */
const TAG_TO_SYMPTOM: [string, string][] = [
  ['astringent', 'astringent'],
  ['sour', 'sour'],
  ['bitter', 'bitter'],
  ['thin', 'thin'],
  ['muddy', 'muddy'],
  ['flat', 'flat'],
  ['harsh', 'bitter'],
]

export function symptomFromBrew(brew: BrewRecord | undefined): string | undefined {
  if (!brew?.tags?.length) return undefined
  for (const [tag, symptom] of TAG_TO_SYMPTOM) {
    if (brew.tags.includes(tag)) return symptom
  }
  return undefined
}

export function mostRecentBrew(brews: BrewRecord[]): BrewRecord | undefined {
  return brews.reduce<BrewRecord | undefined>(
    (best, b) => (!best || b.startedAt > best.startedAt ? b : best),
    undefined,
  )
}
