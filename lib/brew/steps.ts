/**
 * Step compiler — PRD F1.1.
 *
 * A recipe is authored as a list of intents ("pour to 300 g over 30 s"). This
 * compiles that into absolute timed steps with cumulative water targets, so the
 * brew screen can answer one question cheaply and continuously:
 *
 *     at t seconds, how many grams should be on the scale?
 *
 * Everything is derived from elapsed time. Nothing accumulates.
 */

export type Agitation = 'swirl' | 'stir' | 'raoSpin' | 'plunge' | 'none'

/** Untimed steps that happen before the timer starts. */
export type PrepSpec = {
  kind: 'prepare' | 'rinse' | 'dose'
  label: string
  instruction: string
}

export type StepSpec =
  | { kind: 'bloom'; toG?: number; multiple?: number; durationS: number; instruction?: string }
  | { kind: 'pour'; toG: number; pourS: number; instruction?: string }
  | { kind: 'wait'; durationS: number; instruction?: string }
  | { kind: 'agitate'; style: Agitation; durationS: number; instruction?: string }
  | { kind: 'press'; durationS: number; instruction?: string }
  | { kind: 'flip'; durationS?: number; instruction?: string }
  | { kind: 'drain'; expectedS: number; instruction?: string }
  | { kind: 'serve'; instruction?: string }

export type TimedStep = {
  index: number
  kind: StepSpec['kind']
  label: string
  instruction: string
  startS: number
  durationS: number
  endS: number
  waterFromG: number
  waterToG: number
  /** Water is being added during this step, so the screen shows a live ramp. */
  pouring: boolean
  /** User ends this step, not the clock (PRD F1.1 `drain`). */
  userTerminated: boolean
}

export type CompiledRecipe = {
  prep: PrepSpec[]
  steps: TimedStep[]
  totalS: number
  totalWaterG: number
}

export type RecipeInput = {
  doseG: number
  prep?: PrepSpec[]
  steps: StepSpec[]
}

const DEFAULT_BLOOM_MULTIPLE = 2

function label(spec: StepSpec, waterToG: number): string {
  switch (spec.kind) {
    case 'bloom':
      return `Bloom to ${Math.round(waterToG)} g`
    case 'pour':
      return `Pour to ${Math.round(waterToG)} g`
    case 'wait':
      return 'Wait'
    case 'agitate':
      return spec.style === 'raoSpin'
        ? 'Rao spin'
        : spec.style === 'plunge'
          ? 'Plunge'
          : spec.style === 'stir'
            ? 'Stir'
            : 'Swirl'
    case 'press':
      return 'Press'
    case 'flip':
      return 'Flip'
    case 'drain':
      return 'Drain'
    case 'serve':
      return 'Serve'
  }
}

function defaultInstruction(spec: StepSpec, waterToG: number): string {
  switch (spec.kind) {
    case 'bloom':
      return `Wet all the grounds evenly, up to ${Math.round(waterToG)} g.`
    case 'pour':
      return `Pour steadily to ${Math.round(waterToG)} g.`
    case 'wait':
      return 'Leave it alone.'
    case 'agitate':
      return spec.style === 'raoSpin'
        ? 'Spin the brewer to settle the bed flat.'
        : spec.style === 'stir'
          ? 'Stir gently.'
          : spec.style === 'plunge'
            ? 'Press down slowly and evenly.'
            : 'Swirl gently until the bed levels.'
    case 'press':
      return 'Press slowly. Stop at the hiss.'
    case 'flip':
      return 'Flip the brewer onto the carafe.'
    case 'drain':
      return 'Let it draw down. Tap Next when it stops dripping.'
    case 'serve':
      return 'Swirl the carafe and pour.'
  }
}

/** Duration a step occupies on the timeline. */
function durationOf(spec: StepSpec): number {
  switch (spec.kind) {
    case 'bloom':
    case 'wait':
    case 'agitate':
    case 'press':
      return spec.durationS
    case 'pour':
      return spec.pourS
    case 'flip':
      return spec.durationS ?? 5
    case 'drain':
      return spec.expectedS
    case 'serve':
      return 0
  }
}

export function compileRecipe(recipe: RecipeInput): CompiledRecipe {
  if (recipe.doseG <= 0) throw new RangeError('dose must be > 0')

  const steps: TimedStep[] = []
  let t = 0
  let water = 0

  recipe.steps.forEach((spec, index) => {
    const from = water
    let to = water

    if (spec.kind === 'bloom') {
      to = spec.toG ?? recipe.doseG * (spec.multiple ?? DEFAULT_BLOOM_MULTIPLE)
      if (to < from)
        throw new RangeError(`bloom target ${to} g is below the running total ${from} g`)
    } else if (spec.kind === 'pour') {
      to = spec.toG
      if (to < from) {
        throw new RangeError(
          `step ${index} pours to ${to} g but ${from} g has already been added — targets are cumulative`,
        )
      }
    }

    const durationS = durationOf(spec)
    if (durationS < 0) throw new RangeError(`step ${index} has a negative duration`)

    steps.push({
      index,
      kind: spec.kind,
      label: label(spec, to),
      instruction: spec.instruction ?? defaultInstruction(spec, to),
      startS: t,
      durationS,
      endS: t + durationS,
      waterFromG: from,
      waterToG: to,
      pouring: to > from,
      userTerminated: spec.kind === 'drain',
    })

    t += durationS
    water = to
  })

  return { prep: recipe.prep ?? [], steps, totalS: t, totalWaterG: water }
}

/** Index of the step covering time `t`. Clamps at both ends. */
export function stepIndexAt(c: CompiledRecipe, t: number): number {
  if (c.steps.length === 0) return -1
  if (t <= 0) return 0
  for (let i = c.steps.length - 1; i >= 0; i--) {
    if (t >= c.steps[i]!.startS) return i
  }
  return 0
}

/**
 * Target mass on the scale at time `t` — the number the brew screen lives on.
 * Ramps linearly across a pour, holds flat everywhere else.
 */
export function targetMassAt(c: CompiledRecipe, t: number): number {
  if (c.steps.length === 0) return 0
  if (t <= 0) return 0
  if (t >= c.totalS) return c.totalWaterG

  const step = c.steps[stepIndexAt(c, t)]!
  if (!step.pouring || step.durationS === 0) return step.waterFromG

  const progress = Math.min(1, Math.max(0, (t - step.startS) / step.durationS))
  return step.waterFromG + (step.waterToG - step.waterFromG) * progress
}

/** Grams per second the user should be pouring right now, for flow coaching. */
export function targetFlowAt(c: CompiledRecipe, t: number): number {
  const i = stepIndexAt(c, t)
  if (i < 0) return 0
  const step = c.steps[i]!
  if (!step.pouring || step.durationS === 0 || t > step.endS) return 0
  return (step.waterToG - step.waterFromG) / step.durationS
}
