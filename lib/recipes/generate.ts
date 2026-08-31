/**
 * Recipe generator — the full manual.
 *
 * Turns what you have and what you want into a complete brew: how many pours,
 * how many grams in each, at what time, at what grind and temperature — with
 * the reason for every number attached (PRD 5.1).
 *
 * The model is deliberately simple and inspectable. Each input moves a small
 * number of levers by a stated amount, and the rationale reports exactly which
 * input moved which lever. Nothing here is fitted or hidden.
 *
 * ponytail: additive offsets on a base, not a fitted model. Replace only if
 * logged outcomes across users beat it — and keep the rationale either way.
 */

import type { PrepSpec, StepSpec } from '@/lib/brew/steps'
import type { RoastLevel } from '@/lib/calc/freshness'
import { type GrindAdvice, type Grinder, grindAdvice, grinderById } from '@/lib/grinders/registry'
import { BREWERS, type Brewer, type BrewerId } from './brewers'
import type { BuiltinRecipe } from './builtin'
import { PROCESS_BY_ID, type ProcessId, type ProcessMethod } from './process'
import { type BrewWater, type WaterAdvice, waterAdvice } from './water'

export type BrewGoal = 'sweetness' | 'acidity' | 'body' | 'clarity' | 'balance'

export const GOALS: { id: BrewGoal; label: string; blurb: string }[] = [
  { id: 'sweetness', label: 'Sweetness', blurb: 'Round, sugary, forgiving. The safest target.' },
  { id: 'acidity', label: 'Acidity', blurb: 'Bright and fruit-forward. Rewards good beans.' },
  { id: 'body', label: 'Body', blurb: 'Heavier, fuller, more texture in the mouth.' },
  { id: 'clarity', label: 'Clarity', blurb: 'Clean and separated. Every note distinct.' },
  { id: 'balance', label: 'Balance', blurb: 'No single thing dominates. A good default.' },
]

export type GenerateInput = {
  brewerId: BrewerId
  doseG: number
  goal: BrewGoal
  roastLevel: RoastLevel
  /** Growing altitude of the bean, metres above sea level. A density proxy. */
  altitudeMasl?: number
  daysOffRoast?: number
  /** How the cherry was processed. The bag says it; the shelf stores it. */
  processId?: ProcessId
  /** The user's brewing water. Hardness drives extraction, alkalinity mutes it. */
  water?: BrewWater
  grinderId?: string
  /** The user's own grind setting for this brewer, if they have one. */
  baselineSetting?: number
  ratioOverride?: number
  /** Pours after the bloom, split across the two blocks. Overrides the goal. */
  poursOverride?: { a: number; b: number }
  /** Japanese iced: brew hot onto ice instead of chilling afterwards. */
  iced?: boolean
  /**
   * Share of the total water put in the carafe as ice, 0.25 to 0.6. Practice
   * ranges from a third (Temple, De Fer) to half (Kasuya, Complete Home
   * Barista); the default sits between them.
   */
  iceFractionOverride?: number
}

export type Pour = {
  index: number
  label: string
  /** Cumulative target on the scale at the end of this pour. */
  toG: number
  /** Grams added by this pour. */
  addG: number
  startS: number
  pourS: number
  phase: 'bloom' | 'A' | 'B' | 'fill'
}

export type RationaleSection = { heading: string; value: string; lines: string[] }

export type GeneratedRecipe = {
  id: 'generated'
  brewer: Brewer
  goal: BrewGoal
  roastLevel: RoastLevel
  doseG: number
  waterG: number
  ratio: number
  waterTempC: number
  iced: boolean
  /** Split of the total water when brewing onto ice. Zeroed when hot. */
  ice: {
    iceG: number
    hotWaterG: number
    /** Ice as a share of the total water, 0 when hot. */
    fraction: number
    /**
     * Dose to hot water — what the bed actually sees. Kasuya's iced 4:6 is
     * quoted as 1:10 in these terms even though the drink lands near 1:15.
     */
    hotRatio: number
  }
  processId?: ProcessId
  grind: GrindAdvice
  grinder?: Grinder
  pours: Pour[]
  /** How the pour count was arrived at, so the UI can show suggested vs chosen. */
  pourPlan: ResolvedPours
  prep: PrepSpec[]
  steps: StepSpec[]
  totalS: number
  rationale: RationaleSection[]
  warnings: string[]
}

// --- Levers. Every table is a stated offset from a base, never a fitted curve.

const RATIO_BY_GOAL: Record<BrewGoal, number> = {
  body: 15,
  sweetness: 16,
  balance: 16,
  acidity: 16.5,
  clarity: 17,
}

const TEMP_BY_ROAST: Record<RoastLevel, number> = {
  veryLight: 96,
  light: 95,
  mediumLight: 94,
  medium: 92,
  mediumDark: 89,
  dark: 87,
}

const TEMP_BY_GOAL: Record<BrewGoal, number> = {
  acidity: -1,
  body: 1,
  sweetness: 0,
  clarity: 0,
  balance: 0,
}

const MICRONS_BY_ROAST: Record<RoastLevel, number> = {
  veryLight: -70,
  light: -40,
  mediumLight: -15,
  medium: 0,
  mediumDark: 40,
  dark: 80,
}

const MICRONS_BY_GOAL: Record<BrewGoal, number> = {
  acidity: 40,
  clarity: 20,
  balance: 0,
  sweetness: 0,
  body: -30,
}

const BLOOM_S_BY_ROAST: Record<RoastLevel, number> = {
  veryLight: 45,
  light: 45,
  mediumLight: 40,
  medium: 40,
  mediumDark: 35,
  dark: 30,
}

/** Pours after the bloom, split into Kasuya's two blocks. */
const POURS_BY_GOAL: Record<BrewGoal, { a: number; b: number }> = {
  sweetness: { a: 2, b: 3 },
  acidity: { a: 1, b: 2 },
  balance: { a: 1, b: 2 },
  body: { a: 1, b: 3 },
  clarity: { a: 1, b: 2 },
}

const ROAST_LABEL: Record<RoastLevel, string> = {
  veryLight: 'very light',
  light: 'light',
  mediumLight: 'medium-light',
  medium: 'medium',
  mediumDark: 'medium-dark',
  dark: 'dark',
}

function altitudeMicronOffset(m?: number): { offset: number; note?: string } {
  if (m === undefined) return { offset: 0 }
  if (m >= 1800)
    return {
      offset: -40,
      note: `${m} masl is high-grown and dense, so it resists extraction — grinding finer compensates.`,
    }
  if (m >= 1500) return { offset: -15, note: `${m} masl is moderately dense, so slightly finer.` }
  if (m >= 1200) return { offset: 0, note: `${m} masl is mid-altitude — no density adjustment.` }
  return {
    offset: 30,
    note: `${m} masl is lower-grown and softer, so it gives up solubles easily — coarser avoids over-extraction.`,
  }
}

function altitudeTempOffset(m?: number): number {
  if (m === undefined) return 0
  if (m >= 1800) return 1
  if (m >= 1200) return 0
  return -2
}

/**
 * Japanese iced coffee — flash brewing.
 *
 * Part of the brew water is placed in the carafe as ice, and the coffee is
 * brewed hot straight onto it. The total water is unchanged, so the finished
 * drink lands at full strength rather than the watery result of pouring hot
 * coffee over ice afterwards. Chilling in seconds also traps the volatile
 * aromatics that a slow cool-down drives off.
 *
 * 40 % as ice is the middle of published practice: a third at the dry end
 * (Temple, De Fer), half at the wet end (Kasuya, Complete Home Barista).
 */
const ICE_FRACTION = 0.4
const ICE_FRACTION_RANGE = { min: 0.25, max: 0.6 }

/** Less hot water through the bed means less contact time to extract in. */
const ICED_MICRON_OFFSET = -30

/**
 * Flash-brew guides all sit at the top of the range — 93 to 96 C. The bed gets
 * less water than usual, so heat has to make up the extraction it loses.
 */
const ICED_TEMP_OFFSET = 2

/**
 * Below this the bed is starved: bloom and channel-filling eat a share of the
 * hot water that no longer leaves enough behind to extract with.
 */
const MIN_HOT_RATIO = 8

/** The bloom is spent from the hot side, which iced brewing makes scarce. */
const ICED_MAX_BLOOM_SHARE = 0.25

/**
 * Burr geometry, as a small and openly uncertain offset.
 *
 * Flat burrs grind closer to one size — roughly 70-75 % of particles within
 * ±50 µm of target, against 55-60 % for a conical — so a conical produces more
 * fines at the same setting. Those fines over-extract and stall the bed, which
 * is why the same micron target does not taste the same on both.
 *
 * The offset is deliberately 15 µm and not more. The sources are consistent on
 * the direction and inconsistent on the size, and burr geometry within a
 * category varies more than between categories, so anything bolder would be
 * false precision.
 */
const BURR_MICRON_OFFSET = 15

function burrMicronOffset(grinder?: Grinder): { offset: number; note?: string } {
  if (!grinder) return { offset: 0 }
  if (grinder.burrType === 'conical') {
    return {
      offset: BURR_MICRON_OFFSET,
      note: `Conical burrs make a wider spread of particle sizes than flat ones, so more fines at any given setting. Ground ${BURR_MICRON_OFFSET} µm coarser to keep those fines from over-extracting — a small correction, and the direction is better established than the size.`,
    }
  }
  return {
    offset: -BURR_MICRON_OFFSET,
    note: `Flat burrs cluster particles near one size, so fewer fines and less of the early over-extraction they cause. Ground ${BURR_MICRON_OFFSET} µm finer to make up the yield.`,
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round5 = (v: number) => Math.round(v / 5) * 5
/** A cap has to round down, or it stops being a cap. */
const floor5 = (v: number) => Math.floor(v / 5) * 5
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function generateRecipe(input: GenerateInput): GeneratedRecipe {
  const brewer = BREWERS[input.brewerId]
  if (!brewer) throw new Error(`Unknown brewer: ${input.brewerId}`)
  if (input.doseG <= 0) throw new RangeError('dose must be > 0')

  const warnings: string[] = []
  if (input.doseG < brewer.doseRangeG.min || input.doseG > brewer.doseRangeG.max) {
    warnings.push(
      `${input.doseG} g is outside the ${brewer.doseRangeG.min}-${brewer.doseRangeG.max} g range this brewer handles well. Bed depth will change the extraction in ways this recipe does not model.`,
    )
  }

  const process = input.processId ? PROCESS_BY_ID[input.processId] : undefined
  const water = waterAdvice(input.water)

  // --- Ratio and water
  // A manual ratio overrides the processing nudge too: if the user typed 1:16,
  // they meant 1:16.
  const ratio =
    input.ratioOverride ?? RATIO_BY_GOAL[input.goal] + (process ? process.ratioOffset : 0)
  const waterG = round5(input.doseG * ratio)

  // --- Ice, for a Japanese iced brew
  const iced = Boolean(input.iced)
  const iceFraction = iced
    ? clamp(
        input.iceFractionOverride ?? ICE_FRACTION,
        ICE_FRACTION_RANGE.min,
        ICE_FRACTION_RANGE.max,
      )
    : 0
  const iceG = iced ? round5(waterG * iceFraction) : 0
  const hotWaterG = waterG - iceG
  const hotRatio = Math.round((hotWaterG / input.doseG) * 10) / 10
  if (iced && hotRatio < MIN_HOT_RATIO) {
    warnings.push(
      `At ${Math.round(iceFraction * 100)} % ice the bed only sees ${hotWaterG} g of water — 1:${hotRatio}. Below about 1:${MIN_HOT_RATIO} the bloom and the water the grounds hold take too much of it, and the cup comes out thin and sour however fine you grind. Use less ice, or more coffee.`,
    )
  }

  // --- Temperature
  const tempBase = TEMP_BY_ROAST[input.roastLevel]
  const tempAlt = altitudeTempOffset(input.altitudeMasl)
  const tempGoal = TEMP_BY_GOAL[input.goal]
  const tempProcess = process ? process.tempOffsetC : 0
  const tempWater = water ? water.tempOffsetC : 0
  const waterTempC = clamp(
    tempBase + tempAlt + tempGoal + tempProcess + tempWater + (iced ? ICED_TEMP_OFFSET : 0),
    80,
    96,
  )

  // --- Grind
  const alt = altitudeMicronOffset(input.altitudeMasl)
  const grinder = input.grinderId ? grinderById(input.grinderId) : undefined
  const burr = burrMicronOffset(grinder)
  const targetMicrons = clamp(
    brewer.baseMicrons +
      MICRONS_BY_ROAST[input.roastLevel] +
      alt.offset +
      MICRONS_BY_GOAL[input.goal] +
      (process ? process.micronOffset : 0) +
      (water ? water.micronOffset : 0) +
      burr.offset +
      (iced ? ICED_MICRON_OFFSET : 0),
    400,
    1200,
  )
  if (water) warnings.push(...water.warnings)

  const grind = grinder
    ? grindAdvice(grinder, targetMicrons, input.baselineSetting, brewer.baseMicrons)
    : {
        targetMicrons,
        uncertaintyUnits: 0,
        text: `Aim for roughly ${targetMicrons} µm.`,
        caveat: 'Pick your grinder to get this in clicks.',
      }

  // --- Bloom
  const veryFresh = input.daysOffRoast !== undefined && input.daysOffRoast <= 4
  const bloomMultiple =
    input.roastLevel === 'dark' || input.roastLevel === 'mediumDark' ? 2 : veryFresh ? 3 : 2.5
  const bloomG = iced
    ? Math.min(round5(input.doseG * bloomMultiple), floor5(hotWaterG * ICED_MAX_BLOOM_SHARE))
    : round5(input.doseG * bloomMultiple)
  const bloomS = BLOOM_S_BY_ROAST[input.roastLevel] + (veryFresh ? 10 : 0)

  const pourPlan = resolvePours(brewer, input)

  if (pourPlan.overCap) {
    warnings.push(
      `${pourPlan.counts.a + pourPlan.counts.b} pours is more than the ${brewer.maxPours} this bed comfortably takes. Each extra pour adds agitation, and past the cap that usually shows up as a stalled drawdown and astringency.`,
    )
  }

  const built =
    brewer.mode === 'immersion'
      ? buildImmersion(brewer, input, hotWaterG, bloomS, iceG)
      : buildPercolation(brewer, input, hotWaterG, bloomG, bloomS, targetMicrons, iceG)

  const rationale = buildRationale({
    input,
    brewer,
    ratio,
    waterG,
    waterTempC,
    tempBase,
    tempAlt,
    tempGoal,
    targetMicrons,
    iced,
    ice: { iceG, hotWaterG, fraction: iceFraction, hotRatio },
    process,
    water,
    burr,
    tempProcess,
    tempWater,
    altNote: alt.note,
    bloomG,
    bloomS,
    bloomMultiple,
    veryFresh,
    pours: built.pours,
    pourPlan,
    totalS: built.totalS,
  })

  if (built.totalS > 360 && brewer.mode === 'percolation') {
    warnings.push(
      `A ${Math.round(built.totalS / 60)}-minute pourover is long. If it stalls, the grind is too fine for this brewer.`,
    )
  }

  return {
    id: 'generated',
    brewer,
    goal: input.goal,
    roastLevel: input.roastLevel,
    doseG: input.doseG,
    waterG,
    ratio,
    waterTempC,
    iced,
    ice: { iceG, hotWaterG, fraction: iceFraction, hotRatio },
    processId: input.processId,
    grind,
    grinder,
    pours: built.pours,
    pourPlan,
    prep: built.prep,
    steps: built.steps,
    totalS: built.totalS,
    rationale,
    warnings,
  }
}

export type PourCounts = { a: number; b: number }

export type ResolvedPours = {
  counts: PourCounts
  /** What the goal alone would have chosen, before any cap or override. */
  suggested: PourCounts
  /** The brewer's cap trimmed the suggestion. */
  cappedByBrewer: boolean
  /** The user chose these counts, overriding the suggestion. */
  overridden: boolean
  /** The user's override exceeds what this bed comfortably takes. */
  overCap: boolean
}

/**
 * How many pours, and how they split across the two blocks.
 *
 * The goal picks a default, the brewer caps it, and the user can override both
 * — going past the cap warns rather than blocks (PRD F2.2 R5), because it is
 * their bed and their call.
 */
export function resolvePours(brewer: Brewer, input: GenerateInput): ResolvedPours {
  const suggested = POURS_BY_GOAL[input.goal]

  // Immersion is one fill: pour count is not a lever there.
  if (brewer.mode === 'immersion') {
    return {
      counts: { a: 0, b: 0 },
      suggested: { a: 0, b: 0 },
      cappedByBrewer: false,
      overridden: false,
      overCap: false,
    }
  }

  if (input.poursOverride) {
    const a = Math.max(0, Math.round(input.poursOverride.a))
    const b = Math.max(1, Math.round(input.poursOverride.b))
    return {
      counts: { a, b },
      suggested,
      cappedByBrewer: false,
      overridden: a !== suggested.a || b !== suggested.b,
      overCap: a + b > brewer.maxPours,
    }
  }

  let { a, b } = suggested
  const budget = Math.max(1, brewer.maxPours)
  while (a + b > budget) {
    if (b > a) b--
    else if (a > 1) a--
    else break
  }

  return {
    counts: { a, b },
    suggested,
    cappedByBrewer: a !== suggested.a || b !== suggested.b,
    overridden: false,
    overCap: false,
  }
}

// --- Percolation: bloom, then Kasuya's 40 % / 60 % blocks.

function buildPercolation(
  brewer: Brewer,
  input: GenerateInput,
  waterG: number,
  bloomG: number,
  bloomS: number,
  targetMicrons: number,
  iceG: number,
) {
  const { a: aCount, b: bCount } = resolvePours(brewer, input).counts

  // Kasuya's split is of the TOTAL water, bloom included. With no first-block
  // pours at all, its share rolls into the second block rather than vanishing.
  const phaseATotal = waterG * 0.4
  const aRemaining = aCount > 0 ? Math.max(0, phaseATotal - bloomG) : 0
  const bTotal = waterG - bloomG - aRemaining

  // Coarser grind drains faster, so it needs less settling time between pours.
  const flowFactor = brewer.baseMicrons / targetMicrons
  const restS = clamp(Math.round(brewer.baseDrawdownS * 0.4 * flowFactor), 8, 40)

  const pours: Pour[] = []
  const steps: StepSpec[] = []
  let t = 0
  let cumulative = 0

  // Bloom
  pours.push({
    index: 0,
    label: 'Bloom',
    toG: bloomG,
    addG: bloomG,
    startS: 0,
    pourS: Math.max(5, Math.round(bloomG / brewer.pourRateGPerS)),
    phase: 'bloom',
  })
  steps.push({
    kind: 'bloom',
    toG: bloomG,
    durationS: bloomS,
    instruction: `Pour to ${bloomG} g, wetting every ground, then swirl to level the bed.`,
  })
  cumulative = bloomG
  t += bloomS

  const addPours = (count: number, total: number, phase: 'A' | 'B') => {
    if (count <= 0 || total <= 0) return
    const per = total / count
    for (let i = 0; i < count; i++) {
      const isLastOfAll = phase === 'B' && i === count - 1
      const to = round5(cumulative + per)
      const target = isLastOfAll ? waterG : Math.min(to, waterG)
      const addG = target - cumulative
      if (addG <= 0) continue
      const pourS = Math.max(5, Math.round(addG / brewer.pourRateGPerS))

      pours.push({
        index: pours.length,
        label: `Pour ${pours.length}`,
        toG: target,
        addG,
        startS: t,
        pourS,
        phase,
      })
      steps.push({
        kind: 'pour',
        toG: target,
        pourS,
        instruction: `Pour to ${target} g in slow circles, keeping the bed covered.`,
      })
      t += pourS
      cumulative = target

      const more = !(isLastOfAll && phase === 'B')
      if (more) {
        steps.push({ kind: 'wait', durationS: restS, instruction: 'Let the level drop.' })
        t += restS
      }
    }
  }

  addPours(aCount, aRemaining, 'A')
  addPours(bCount, bTotal, 'B')

  // A final swirl levels the bed so the drawdown is even. Skipped when chasing
  // clarity, because agitation drives fines into the filter.
  if (input.goal !== 'clarity') {
    steps.push({
      kind: 'agitate',
      style: 'swirl',
      durationS: 10,
      instruction: 'Swirl gently until the bed sits flat.',
    })
    t += 10
  }

  if (brewer.mode === 'hybrid') {
    steps.push({
      kind: 'wait',
      durationS: 60,
      instruction: 'Keep the switch closed and let it steep. This is the immersion phase.',
    })
    t += 60
    steps.push({
      kind: 'flip',
      durationS: 5,
      instruction: 'Open the switch to start the drawdown.',
    })
    t += 5
  }

  const drawdownS = clamp(Math.round(brewer.baseDrawdownS * flowFactor), 20, 180)
  steps.push({ kind: 'drain', expectedS: drawdownS })
  t += drawdownS

  steps.push({
    kind: 'serve',
    instruction:
      iceG > 0
        ? 'Swirl until the last of the ice melts. If cubes are still floating, the drink is stronger than the recipe says — swirl longer rather than leaving them. Pouring over fresh ice in the glass will dilute it further.'
        : 'Swirl the carafe and pour.',
  })

  const prep: PrepSpec[] = [
    {
      kind: 'rinse',
      label: 'Rinse the filter',
      instruction: `Rinse with hot water to remove paper taste and preheat the ${brewer.name}. Tip the water out.`,
    },
    ...(iceG > 0
      ? [
          {
            kind: 'prepare' as const,
            label: `Weigh ${iceG} g of ice`,
            instruction: `Put ${iceG} g of solid cubes in the carafe — not crushed, which melts before the brew lands and dilutes it — then zero your scale with it in place. The brew drips straight onto the ice.`,
          },
        ]
      : []),
    ...(brewer.mode === 'hybrid'
      ? [
          {
            kind: 'prepare' as const,
            label: 'Close the switch',
            instruction: 'Push the switch closed so the brewer holds water.',
          },
        ]
      : []),
    {
      kind: 'dose',
      label: `Dose ${input.doseG} g`,
      instruction: `Grind ${input.doseG} g. Level the bed and zero your scale.`,
    },
  ]

  return { pours, steps, prep, totalS: t }
}

// --- Immersion: one pour, then time does the work.

function buildImmersion(
  brewer: Brewer,
  input: GenerateInput,
  waterG: number,
  _bloomS: number,
  iceG: number,
) {
  const isPress = brewer.id === 'frenchPress'
  const steepS = isPress ? 240 : input.goal === 'body' ? 150 : 105
  const pourS = Math.max(10, Math.round(waterG / brewer.pourRateGPerS))

  const pours: Pour[] = [
    {
      index: 0,
      label: 'Single pour',
      toG: waterG,
      addG: waterG,
      startS: 0,
      pourS,
      phase: 'fill',
    },
  ]

  const steps: StepSpec[] = [
    {
      kind: 'pour',
      toG: waterG,
      pourS,
      instruction: `Pour to ${waterG} g, wetting all the grounds.`,
    },
  ]
  let t = pourS

  if (!isPress) {
    steps.push({
      kind: 'agitate',
      style: 'stir',
      durationS: 10,
      instruction: 'Stir three times, gently.',
    })
    t += 10
  }

  steps.push({
    kind: 'wait',
    durationS: steepS,
    instruction: isPress
      ? 'Steep. Leave it completely alone.'
      : 'Steep. Insert the plunger to stop it dripping.',
  })
  t += steepS

  if (isPress) {
    steps.push({
      kind: 'agitate',
      style: 'stir',
      durationS: 20,
      instruction: 'Break the crust, then skim the foam and floating grounds off the top.',
    })
    steps.push({
      kind: 'wait',
      durationS: 300,
      instruction: 'Rest 5 more minutes so the fines sink instead of being plunged into the cup.',
    })
    steps.push({
      kind: 'press',
      durationS: 15,
      instruction: 'Lower the plunger just to the surface. Do not push it down.',
    })
    t += 335
  } else {
    steps.push({
      kind: 'press',
      durationS: 30,
      instruction: 'Press slowly and steadily. Stop at the hiss.',
    })
    t += 30
  }

  steps.push({
    kind: 'serve',
    instruction: isPress
      ? iceG > 0
        ? 'Decant straight onto the ice in one go, leaving the last centimetre and its sediment behind. Swirl until the ice has melted.'
        : 'Pour off gently, leaving the last centimetre behind.'
      : iceG > 0
        ? 'Swirl until the last of the ice melts, then serve.'
        : 'Serve.',
  })

  const prep: PrepSpec[] = [
    {
      kind: 'prepare',
      label: 'Preheat',
      instruction: isPress
        ? 'Rinse the press with hot water.'
        : 'Rinse the paper filter in the cap, screw it on, and stand the chamber on your mug.',
    },
    ...(iceG > 0
      ? [
          {
            kind: 'prepare' as const,
            label: `Weigh ${iceG} g of ice`,
            instruction: `Put ${iceG} g of solid cubes — not crushed — in the ${isPress ? 'carafe you will decant into' : 'vessel you will press into'}, then zero your scale with it in place.`,
          },
        ]
      : []),
    {
      kind: 'dose',
      label: `Dose ${input.doseG} g`,
      instruction: `Grind ${input.doseG} g and add it to the ${brewer.name}. Zero your scale.`,
    },
  ]

  return { pours, steps, prep, totalS: t }
}

// --- Rationale: every number, and what moved it.

function buildRationale(a: {
  input: GenerateInput
  brewer: Brewer
  ratio: number
  waterG: number
  waterTempC: number
  tempBase: number
  tempAlt: number
  tempGoal: number
  targetMicrons: number
  iced: boolean
  ice: { iceG: number; hotWaterG: number; fraction: number; hotRatio: number }
  process?: ProcessMethod
  water?: WaterAdvice
  burr: { offset: number; note?: string }
  tempProcess: number
  tempWater: number
  altNote?: string
  bloomG: number
  bloomS: number
  bloomMultiple: number
  veryFresh: boolean
  pours: Pour[]
  pourPlan: ResolvedPours
  totalS: number
}): RationaleSection[] {
  const goal = a.input.goal
  const roast = ROAST_LABEL[a.input.roastLevel]
  const aPours = a.pours.filter((p) => p.phase === 'A').length
  const bPours = a.pours.filter((p) => p.phase === 'B').length

  const sections: RationaleSection[] = []

  sections.push({
    heading: 'Brewer',
    value: a.brewer.name,
    lines: [a.brewer.character, ...(a.brewer.constraint ? [a.brewer.constraint] : [])],
  })

  if (a.iced) {
    sections.push({
      heading: 'Ice',
      value: `${a.ice.hotWaterG} g hot + ${a.ice.iceG} g ice`,
      lines: [
        'Japanese iced coffee: the ice is part of the recipe water, not an addition to it. Brewing hot straight onto it chills the coffee in seconds.',
        'That matters because the aromatics you want are volatile — a slow cool-down lets them escape, while a flash chill traps them. It is why this tastes closer to the hot cup than cold brew does.',
        `The total is still ${a.waterG} g, so the finished drink lands at full strength once the ice melts in. Pouring hot coffee over ice afterwards would dilute it instead.`,
        `${Math.round(a.ice.fraction * 100)} % of the water is ice. Published recipes run from a third to a half; more ice chills harder and brews a stronger concentrate, less ice is gentler on the bed but may not melt away completely.`,
        `The bed itself sees 1:${a.ice.hotRatio}. That is the number to watch when you move the ice: the drink is still 1:${a.ratio}, but the extraction happens at the tighter one.`,
        'Ground finer than the hot version, because there is less hot water passing through the bed and so less time to extract in, and brewed hotter for the same reason.',
        'Cold mutes sweetness and body. If it tastes thin over ice at a ratio you like hot, tighten the ratio a point or two rather than reaching for the grinder.',
      ],
    })
  }

  sections.push({
    heading: 'Ratio',
    value: a.iced
      ? `${a.input.doseG} g to ${a.waterG} g — 1:${a.ratio}, ${a.ice.iceG} g of it as ice`
      : `${a.input.doseG} g to ${a.waterG} g — 1:${a.ratio}`,
    lines: [
      goal === 'body'
        ? 'Tighter than standard: more coffee per litre is the direct route to a heavier cup, and it does it without pushing extraction up.'
        : goal === 'clarity'
          ? 'Looser than standard: more water per gram gives a lighter, more separated cup at the same extraction.'
          : goal === 'acidity'
            ? 'Slightly loose, so brightness reads as brightness rather than intensity.'
            : 'A middle ratio that leaves room to move in either direction once you taste it.',
      'Ratio sets strength. It is not the lever for sour or bitter — that is extraction.',
      ...(a.process && a.process.ratioOffset !== 0 && a.input.ratioOverride === undefined
        ? [
            `${a.process.label} adds ${a.process.ratioOffset} to that. Its sugars arrive early, so a little more water per gram keeps the cup from turning heavy before the extraction is finished.`,
          ]
        : []),
    ],
  })

  const tempLines = [`${roast} roast starts at ${a.tempBase} °C.`]
  if (a.tempAlt !== 0) {
    tempLines.push(
      a.tempAlt > 0
        ? `High-grown beans are denser and need the extra heat: ${a.tempAlt > 0 ? '+' : ''}${a.tempAlt} °C.`
        : `Lower-grown beans give up solubles easily, so ${a.tempAlt} °C avoids pulling out harshness.`,
    )
  }
  if (a.tempGoal !== 0) {
    tempLines.push(
      a.tempGoal > 0
        ? `Chasing body: +${a.tempGoal} °C raises extraction of the heavier compounds.`
        : `Chasing acidity: ${a.tempGoal} °C keeps the bitter, heavy compounds in the grounds.`,
    )
  }
  if (a.tempProcess !== 0 && a.process) {
    tempLines.push(
      a.tempProcess < 0
        ? `${a.process.label}: ${a.tempProcess} °C. ${a.process.why}`
        : `${a.process.label}: +${a.tempProcess} °C. ${a.process.why}`,
    )
  }
  if (a.tempWater !== 0) {
    tempLines.push(
      `+${a.tempWater} °C for your water's alkalinity — heat is the only lever left once the buffer is neutralising acids on the way out.`,
    )
  }
  if (a.waterTempC === 96) {
    tempLines.push('Capped at 96 °C. Boiling water scalds the bed and adds nothing.')
  }
  sections.push({ heading: 'Temperature', value: `${a.waterTempC} °C`, lines: tempLines })

  if (a.process) {
    sections.push({
      heading: 'Processing',
      value: a.process.label,
      lines: [
        a.process.character,
        a.process.why,
        ...(a.process.technique ? [a.process.technique] : []),
      ],
    })
  }

  if (a.water) {
    sections.push({
      heading: 'Water',
      value: a.water.value,
      lines: [
        'Water is 98.5 % of the cup and it is not a passive solvent: hardness carries flavour compounds out of the grounds, alkalinity neutralises the acids once they are out.',
        ...a.water.lines,
      ],
    })
  }

  const grindLines = [
    `${a.brewer.name} sits around ${a.brewer.baseMicrons} µm at a medium roast.`,
    a.input.roastLevel === 'medium'
      ? 'A medium roast needs no adjustment from that base.'
      : MICRONS_BY_ROAST[a.input.roastLevel] < 0
        ? `A ${roast} roast is denser and less soluble, so ${Math.abs(MICRONS_BY_ROAST[a.input.roastLevel])} µm finer.`
        : `A ${roast} roast is brittle and very soluble, so ${MICRONS_BY_ROAST[a.input.roastLevel]} µm coarser to avoid over-extracting.`,
  ]
  if (a.altNote) grindLines.push(a.altNote)
  if (a.process && a.process.micronOffset !== 0) {
    grindLines.push(
      a.process.micronOffset > 0
        ? `${a.process.label}: ${a.process.micronOffset} µm coarser. Fermentation-derived sugars dissolve early and readily, and pushing them turns fruit into ferment.`
        : `${a.process.label}: ${Math.abs(a.process.micronOffset)} µm finer. Without mucilage sugars there is less that comes out easily, so extraction needs help.`,
    )
  }
  if (a.water && a.water.micronOffset !== 0) {
    grindLines.push(
      a.water.micronOffset > 0
        ? `Your water is hard, so it extracts harder: ${a.water.micronOffset} µm coarser to hold the yield down.`
        : `Your water is soft, so it extracts less at any given grind: ${Math.abs(a.water.micronOffset)} µm finer to make it up.`,
    )
  }
  if (a.burr.note) grindLines.push(a.burr.note)
  if (MICRONS_BY_GOAL[goal] !== 0) {
    grindLines.push(
      MICRONS_BY_GOAL[goal] > 0
        ? `Chasing ${goal}: ${MICRONS_BY_GOAL[goal]} µm coarser holds extraction back, which keeps acids forward and the cup clean.`
        : `Chasing ${goal}: ${Math.abs(MICRONS_BY_GOAL[goal])} µm finer raises extraction, which is where texture comes from.`,
    )
  }
  sections.push({ heading: 'Grind', value: `${a.targetMicrons} µm`, lines: grindLines })

  if (a.brewer.mode !== 'immersion') {
    sections.push({
      heading: 'Bloom',
      value: `${a.bloomG} g for ${a.bloomS} s`,
      lines: [
        `${a.bloomMultiple}x the dose — enough water to wet every ground without the bed flooding.`,
        a.veryFresh
          ? `Only ${a.input.daysOffRoast} days off roast, so there is a lot of CO2 to drive off. Longer bloom, and expect it to swell hard.`
          : 'The bloom drives off CO2 that would otherwise push water away from the grounds.',
      ],
    })

    sections.push({
      heading: 'Pours',
      value: `${a.pours.length - 1} after the bloom (${aPours} + ${bPours})`,
      lines: [
        'The first 40 % of the water sets the balance between acidity and sweetness. The last 60 % sets strength.',
        aPours === 0
          ? 'No pour in the first block: its water rolls into the second, which pushes the cup towards strength over balance.'
          : aPours >= 2
            ? `${aPours} smaller pours in the first block extract more gently and land sweeter.`
            : 'One larger pour in the first block keeps acidity forward.',
        bPours >= 3
          ? `${bPours} pours in the second block build strength and body.`
          : `${plural(bPours, 'pour')} in the second block keeps the cup lighter and cleaner.`,
        ...(a.pourPlan.cappedByBrewer
          ? [
              `Capped at ${a.brewer.maxPours} pours: ${a.brewer.constraint ?? 'this bed will not take more.'}`,
            ]
          : []),
        ...(a.pourPlan.overridden
          ? [
              `You chose this split. For ${goal} the suggestion was ${a.pourPlan.suggested.a} + ${a.pourPlan.suggested.b}.`,
            ]
          : []),
        ...(goal === 'clarity'
          ? ['No final swirl: agitation drives fines into the filter and muddies the cup.']
          : ['A final swirl levels the bed so the drawdown is even rather than channelled.']),
      ],
    })
  } else {
    sections.push({
      heading: 'Steep',
      value: `${Math.round(a.totalS / 60)} min total`,
      lines: [
        'Full immersion, so grind and time carry the recipe — there is no pour technique to get wrong.',
        a.brewer.constraint ?? '',
      ].filter(Boolean),
    })
  }

  return sections
}

/**
 * Adapt a generated recipe to the shape the brew runner already consumes, so
 * one screen runs both built-in and generated recipes.
 */
export function toRunnable(r: GeneratedRecipe): BuiltinRecipe {
  return {
    id: 'generated',
    name: `${r.brewer.name} for ${r.goal}`,
    methodId: (r.brewer.id === 'origami' || r.brewer.id === 'kalita'
      ? 'v60'
      : r.brewer.id) as BuiltinRecipe['methodId'],
    methodName: r.brewer.name,
    doseG: r.doseG,
    waterG: r.waterG,
    waterTempC: r.waterTempC,
    grind: r.grind.text,
    brewerId: r.brewer.id,
    goal: r.goal,
    iced: r.iced,
    ...(r.ice.iceG > 0 ? { iceG: r.ice.iceG } : {}),
    // The number the recipe actually asks for. Dropping this was why the log
    // fell back to a stale baseline instead of the setting just recommended.
    ...(r.grind.settingUnits !== undefined ? { grindSetting: String(r.grind.settingUnits) } : {}),
    intent: r.goal === 'acidity' ? 'clarity' : (r.goal as BuiltinRecipe['intent']),
    optimisingFor: r.rationale.find((s) => s.heading === 'Ratio')?.lines[0] ?? '',
    geometry: r.brewer.geometry,
    notes: r.rationale.flatMap((s) => s.lines),
    prep: r.prep,
    steps: r.steps,
  }
}
