/**
 * Recipe scaling — PRD 9.3, F2.2.
 *
 * Water scales with the dose. Bloom does not scale with total yield. Time does
 * not scale linearly with mass, because what actually changes is bed depth.
 */

export type BrewerGeometry = 'cone' | 'flatBottom' | 'immersion'

/**
 * Exponent k in timeFactor = doseRatio^k.
 *
 * In a cone, grounds occupy a volume that grows as the cube of depth, so depth
 * grows as the cube root of dose. A flat bed has constant cross-section, so
 * depth grows closer to linearly, tempered by the wider flow path. Immersion
 * time is set by the steep, not by the bed, so it does not scale at all.
 *
 * ponytail: geometric heuristic, not fluid dynamics. Replace with a fitted
 * model only if logged drawdown times across scaled recipes contradict it.
 */
const TIME_EXPONENT: Record<BrewerGeometry, number> = {
  cone: 1 / 3,
  flatBottom: 1 / 2,
  immersion: 0,
}

export type ScalableRecipe = {
  doseG: number
  waterG: number
  bloomWaterG: number
  totalTimeS: number
  geometry: BrewerGeometry
  /** Validated dose band for this brewer, PRD F2.2 R2. */
  validDoseG?: { min: number; max: number }
}

export type ScaleResult = {
  doseG: number
  waterG: number
  bloomWaterG: number
  totalTimeS: number
  ratio: number
  timeFactor: number
  warnings: string[]
}

/** Bloom water bounds as a multiple of dose. PRD F2.2 R2. */
export const BLOOM_MULTIPLE = { min: 2, max: 3 } as const

export function bloomWaterFor(doseG: number, preferredMultiple = 2.5): number {
  const m = Math.min(Math.max(preferredMultiple, BLOOM_MULTIPLE.min), BLOOM_MULTIPLE.max)
  return doseG * m
}

/** Scale by dose. Ratio is preserved; bloom and time are recomputed, not scaled. */
export function scaleToDose(recipe: ScalableRecipe, targetDoseG: number): ScaleResult {
  if (targetDoseG <= 0) throw new RangeError('target dose must be > 0')
  if (recipe.doseG <= 0) throw new RangeError('source dose must be > 0')

  const doseRatio = targetDoseG / recipe.doseG
  const brewRatio = recipe.waterG / recipe.doseG
  const timeFactor = doseRatio ** TIME_EXPONENT[recipe.geometry]

  // Bloom follows the dose and stays inside its own bounds — it never scales
  // with total yield, which is the mistake this function exists to prevent.
  const sourceMultiple = recipe.bloomWaterG / recipe.doseG
  const bloomWaterG = bloomWaterFor(targetDoseG, sourceMultiple)

  const warnings: string[] = []
  if (sourceMultiple < BLOOM_MULTIPLE.min || sourceMultiple > BLOOM_MULTIPLE.max) {
    warnings.push(
      `Source bloom was ${sourceMultiple.toFixed(1)}x dose, outside the ${BLOOM_MULTIPLE.min}-${BLOOM_MULTIPLE.max}x band. Clamped.`,
    )
  }
  if (recipe.validDoseG) {
    const { min, max } = recipe.validDoseG
    if (targetDoseG < min || targetDoseG > max) {
      warnings.push(
        `${targetDoseG} g is outside this brewer's validated ${min}-${max} g band. Bed depth will change the extraction in ways this scaling does not model.`,
      )
    }
  }
  if (doseRatio >= 2 || doseRatio <= 0.5) {
    warnings.push(
      'Scaling by more than 2x in either direction leaves the range these time models were fitted on. Treat the result as a starting point and expect to re-dial.',
    )
  }

  return {
    doseG: targetDoseG,
    waterG: targetDoseG * brewRatio,
    bloomWaterG,
    totalTimeS: recipe.totalTimeS * timeFactor,
    ratio: brewRatio,
    timeFactor,
    warnings,
  }
}

/** Scale by finished yield instead of dose — the same maths, entered the other way. */
export function scaleToWater(recipe: ScalableRecipe, targetWaterG: number): ScaleResult {
  if (targetWaterG <= 0) throw new RangeError('target water must be > 0')
  const brewRatio = recipe.waterG / recipe.doseG
  return scaleToDose(recipe, targetWaterG / brewRatio)
}
