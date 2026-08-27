/**
 * Freshness — PRD 9.4, Appendix E.
 *
 * A per-roast-level prior over days off roast, blended with the user's own
 * scored brews once there are enough of them. The generic curve is a starting
 * point; the point of the blend is that the app converges on THEIR peak window
 * rather than a chart's.
 */

export type RoastLevel = 'veryLight' | 'light' | 'mediumLight' | 'medium' | 'mediumDark' | 'dark'

export type FreshnessState = 'resting' | 'peak' | 'good' | 'fading' | 'stale'

/**
 * Day boundaries for filter brewing. Darker roasts degas faster and stale
 * sooner; light roasts need a longer rest and hold far longer.
 *
 * ponytail: literature-and-practice prior, not measured here. It is deliberately
 * a plain table so it can be replaced by aggregate log data without touching
 * any calling code.
 */
export const FRESHNESS_WINDOWS: Record<
  RoastLevel,
  { peakStart: number; peakEnd: number; goodUntil: number; fadingUntil: number }
> = {
  veryLight: { peakStart: 10, peakEnd: 21, goodUntil: 35, fadingUntil: 56 },
  light: { peakStart: 7, peakEnd: 18, goodUntil: 30, fadingUntil: 50 },
  mediumLight: { peakStart: 5, peakEnd: 14, goodUntil: 26, fadingUntil: 42 },
  medium: { peakStart: 4, peakEnd: 12, goodUntil: 24, fadingUntil: 38 },
  mediumDark: { peakStart: 3, peakEnd: 10, goodUntil: 20, fadingUntil: 32 },
  dark: { peakStart: 2, peakEnd: 7, goodUntil: 16, fadingUntil: 26 },
}

export type FreshnessAssessment = {
  state: FreshnessState
  daysOffRoast: number
  window: { peakStart: number; peakEnd: number }
  /** True once the window has been shifted by the user's own logged brews. */
  personalised: boolean
  note: string
}

export function daysOffRoast(roastDate: Date, now: Date): number {
  const ms = now.getTime() - roastDate.getTime()
  return Math.floor(ms / 86_400_000)
}

export type ScoredBrew = { daysOffRoast: number; score: number }

/** PRD 9.4: blend the prior with the user's own data once there are >= 6 brews. */
const MIN_BREWS_TO_PERSONALISE = 6

/**
 * Shift the peak window toward where this user's high scores actually cluster.
 * A weighted mean of observed days (weighted by score) versus the prior's
 * midpoint, at half strength so a handful of brews cannot yank the window far.
 */
function personalisedWindow(
  prior: { peakStart: number; peakEnd: number },
  brews: ScoredBrew[],
): { peakStart: number; peakEnd: number } | null {
  const usable = brews.filter((b) => b.score > 0)
  if (usable.length < MIN_BREWS_TO_PERSONALISE) return null

  const totalWeight = usable.reduce((s, b) => s + b.score, 0)
  const observedCentre = usable.reduce((s, b) => s + b.daysOffRoast * b.score, 0) / totalWeight
  const priorCentre = (prior.peakStart + prior.peakEnd) / 2
  const shift = (observedCentre - priorCentre) / 2

  return {
    peakStart: Math.max(0, prior.peakStart + shift),
    peakEnd: Math.max(1, prior.peakEnd + shift),
  }
}

export function assessFreshness(input: {
  roastLevel: RoastLevel
  daysOffRoast: number
  /** This user's scored brews on this bag, or on this roaster's coffees. */
  history?: ScoredBrew[]
}): FreshnessAssessment {
  const prior = FRESHNESS_WINDOWS[input.roastLevel]
  const personal = input.history ? personalisedWindow(prior, input.history) : null
  const window = personal ?? { peakStart: prior.peakStart, peakEnd: prior.peakEnd }
  const d = input.daysOffRoast

  let state: FreshnessState
  let note: string

  if (d < window.peakStart) {
    state = 'resting'
    const wait = Math.ceil(window.peakStart - d)
    note = `Still degassing. Expect an aggressive bloom and muted sweetness. Give it ${wait} more day${wait === 1 ? '' : 's'}, or bloom longer with cooler water.`
  } else if (d <= window.peakEnd) {
    state = 'peak'
    note = 'In its window. This is the coffee to dial in on.'
  } else if (d <= prior.goodUntil) {
    state = 'good'
    note = 'Past peak but still good. Aromatics are fading before the sweetness does.'
  } else if (d <= prior.fadingUntil) {
    state = 'fading'
    note = 'Fading. Consider a slightly finer grind or hotter water to recover body.'
  } else {
    state = 'stale'
    note = 'Stale. Little CO2 left, flat aromatics. Not worth dialling in.'
  }

  return { state, daysOffRoast: d, window, personalised: personal !== null, note }
}
