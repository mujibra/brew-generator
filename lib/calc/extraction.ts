/**
 * Extraction maths — PRD 9.1.
 *
 * Two independent numbers that users constantly conflate:
 *   strength (TDS %)        — how much dissolved coffee is in the water
 *   extraction yield (EY %) — what fraction of the grounds dissolved
 */

/** Liquid retained per gram of coffee, by method family. PRD 9.1 defaults. */
export const LRR = {
  paperCone: 2.0, // V60, Kalita, Chemex, Origami, Orea
  immersionDecanted: 2.15, // French press, Clever, Switch
  pressed: 1.8, // AeroPress
} as const

export type MethodFamily = keyof typeof LRR

/** SCA Golden Cup targets. PRD 8.7 — a well-evidenced default, not a law. */
export const GOLDEN_CUP = {
  ey: { min: 18, max: 22 },
  tds: { min: 1.15, max: 1.35 },
  /** g coffee per litre of brew water, 55 +/- 10 %. */
  strengthGPerL: { min: 49.5, target: 55, max: 60.5 },
} as const

export type BeverageMass =
  | { kind: 'measured'; grams: number }
  | { kind: 'estimated'; grams: number; lrr: number }

/**
 * Beverage mass: measured if we have it, estimated if we do not.
 *
 * The `kind` tag exists so the UI can render estimates visually distinct from
 * measurements (PRD 9.1). Never let an estimate masquerade as a fact.
 */
export function beverageMass(input: {
  measuredG?: number
  totalWaterG: number
  doseG: number
  method?: MethodFamily
  lrrOverride?: number
}): BeverageMass {
  if (input.measuredG !== undefined) {
    if (input.measuredG <= 0) throw new RangeError('measured beverage mass must be > 0')
    return { kind: 'measured', grams: input.measuredG }
  }
  const lrr = input.lrrOverride ?? LRR[input.method ?? 'paperCone']
  const grams = input.totalWaterG - input.doseG * lrr
  if (grams <= 0) {
    throw new RangeError(
      `dose ${input.doseG} g absorbs all ${input.totalWaterG} g of water at LRR ${lrr}`,
    )
  }
  return { kind: 'estimated', grams, lrr }
}

/** EY% = (TDS% * beverageMass) / dose. */
export function extractionYield(input: {
  tdsPct: number
  doseG: number
  beverage: BeverageMass
}): { eyPct: number; estimated: boolean } {
  if (input.doseG <= 0) throw new RangeError('dose must be > 0')
  if (input.tdsPct <= 0) throw new RangeError('TDS must be > 0')
  return {
    eyPct: (input.tdsPct * input.beverage.grams) / input.doseG,
    estimated: input.beverage.kind === 'estimated',
  }
}

/** Reverse: what TDS would land a given EY. For the target-setting tool, PRD F9. */
export function tdsForTargetEy(input: {
  targetEyPct: number
  doseG: number
  beverageG: number
}): number {
  if (input.beverageG <= 0) throw new RangeError('beverage mass must be > 0')
  return (input.targetEyPct * input.doseG) / input.beverageG
}

export type ControlChartZone =
  | 'ideal'
  | 'under-weak'
  | 'under-strong'
  | 'over-weak'
  | 'over-strong'
  | 'under'
  | 'over'
  | 'weak'
  | 'strong'

/**
 * Where a brew lands on the brew control chart (PRD F3 R6).
 *
 * Reports the two axes separately, because "weak" and "under-extracted" are
 * different problems with different fixes and the whole product depends on
 * users learning that.
 */
export function controlChartZone(eyPct: number, tdsPct: number): ControlChartZone {
  const under = eyPct < GOLDEN_CUP.ey.min
  const over = eyPct > GOLDEN_CUP.ey.max
  const weak = tdsPct < GOLDEN_CUP.tds.min
  const strong = tdsPct > GOLDEN_CUP.tds.max

  if (under && weak) return 'under-weak'
  if (under && strong) return 'under-strong'
  if (over && weak) return 'over-weak'
  if (over && strong) return 'over-strong'
  if (under) return 'under'
  if (over) return 'over'
  if (weak) return 'weak'
  if (strong) return 'strong'
  return 'ideal'
}

/** Brew ratio helpers. `ratio` is always water:coffee, so 1:16 is the number 16. */
export const ratio = {
  fromDoseWater: (doseG: number, waterG: number) => waterG / doseG,
  waterFor: (doseG: number, r: number) => doseG * r,
  doseFor: (waterG: number, r: number) => waterG / r,
  /** g coffee per litre of brew water — the unit the SCA standard uses. */
  toGramsPerLitre: (r: number) => 1000 / r,
  fromGramsPerLitre: (gPerL: number) => 1000 / gPerL,
}
