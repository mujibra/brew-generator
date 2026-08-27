/**
 * Water chemistry — PRD F7, Appendix D.
 *
 * Hardness and alkalinity are both reported in ppm as CaCO3, which is the unit
 * the SCA standard and every water recipe in the wild uses. Converting ion mass
 * to CaCO3 equivalent is the step most home calculators get wrong, so the
 * per-salt constants below are derived from molar masses and kept visible.
 */

/** SCA target brewing water. PRD Appendix D. Read-only reference profile. */
export const SCA_TARGET = {
  name: 'SCA target',
  tdsMgL: 150,
  ghPpmCaCO3: 68,
  khPpmCaCO3: 40,
  sodiumMgL: 10,
  ph: 7,
} as const

export const SCA_ACCEPTABLE = {
  tdsMgL: { min: 75, max: 250 },
  ghPpmCaCO3: { min: 17, max: 85 },
  ph: { min: 6.5, max: 7.5 },
} as const

/** Molar masses (g/mol) used to derive the per-salt contributions below. */
const M = {
  CaCO3: 100.087,
  Ca: 40.078,
  Mg: 24.305,
  Na: 22.9898,
  K: 39.0983,
  epsom: 246.475, // MgSO4 * 7H2O
  calciumChloride: 147.015, // CaCl2 * 2H2O
  gypsum: 172.172, // CaSO4 * 2H2O
  sodiumBicarb: 84.007, // NaHCO3
  potassiumBicarb: 100.115, // KHCO3
  SO4: 96.06,
  Cl: 35.45,
} as const

/** CaCO3 equivalence factors: multiply an ion's mg/L to get ppm as CaCO3. */
const AS_CACO3 = {
  fromCa: M.CaCO3 / M.Ca, // 2.4973
  fromMg: M.CaCO3 / M.Mg, // 4.1179
  /** Bicarbonate alkalinity: 1 eq of HCO3- equals 50.04 g of CaCO3. */
  perEqHCO3: M.CaCO3 / 2,
} as const

export type SaltName = 'epsom' | 'calciumChloride' | 'gypsum' | 'sodiumBicarb' | 'potassiumBicarb'

/** What 1 g of each salt dissolved in 1 L of water contributes. */
export const SALT_CONTRIBUTION: Record<
  SaltName,
  {
    label: string
    ghPpm: number
    khPpm: number
    sodiumMgL: number
    potassiumMgL: number
    /**
     * Fraction of the weighed salt that actually ends up as dissolved ions.
     *
     * Hydrated salts carry crystal water that becomes part of the solvent, not
     * the solute. Epsom salt is MgSO4 * 7H2O — over half its mass is water — so
     * summing weighed mass overstates TDS badly.
     */
    dissolvedFraction: number
  }
> = {
  epsom: {
    label: 'Epsom salt (MgSO4·7H2O)',
    ghPpm: (M.Mg / M.epsom) * 1000 * AS_CACO3.fromMg,
    khPpm: 0,
    sodiumMgL: 0,
    potassiumMgL: 0,
    // Mg + SO4 out of MgSO4 * 7H2O
    dissolvedFraction: (M.Mg + M.SO4) / M.epsom,
  },
  calciumChloride: {
    label: 'Calcium chloride (CaCl2·2H2O)',
    ghPpm: (M.Ca / M.calciumChloride) * 1000 * AS_CACO3.fromCa,
    khPpm: 0,
    sodiumMgL: 0,
    potassiumMgL: 0,
    // Ca + 2Cl out of CaCl2 * 2H2O
    dissolvedFraction: (M.Ca + M.Cl * 2) / M.calciumChloride,
  },
  gypsum: {
    label: 'Gypsum (CaSO4·2H2O)',
    ghPpm: (M.Ca / M.gypsum) * 1000 * AS_CACO3.fromCa,
    khPpm: 0,
    sodiumMgL: 0,
    potassiumMgL: 0,
    // Ca + SO4 out of CaSO4 * 2H2O
    dissolvedFraction: (M.Ca + M.SO4) / M.gypsum,
  },
  sodiumBicarb: {
    label: 'Sodium bicarbonate (NaHCO3)',
    ghPpm: 0,
    khPpm: (1000 / M.sodiumBicarb) * AS_CACO3.perEqHCO3,
    sodiumMgL: (M.Na / M.sodiumBicarb) * 1000,
    potassiumMgL: 0,
    // Anhydrous and fully soluble.
    dissolvedFraction: 1,
  },
  potassiumBicarb: {
    label: 'Potassium bicarbonate (KHCO3)',
    ghPpm: 0,
    khPpm: (1000 / M.potassiumBicarb) * AS_CACO3.perEqHCO3,
    sodiumMgL: 0,
    potassiumMgL: (M.K / M.potassiumBicarb) * 1000,
    dissolvedFraction: 1,
  },
}

export type SaltDoses = Partial<Record<SaltName, number>> // g per litre

export type WaterProfile = {
  ghPpmCaCO3: number
  khPpmCaCO3: number
  sodiumMgL: number
  potassiumMgL: number
  /**
   * Approximate: the mass of dissolved ions, excluding water of crystallisation.
   * A TDS meter reads conductivity and converts with its own factor, so it will
   * not match exactly. Shown as an estimate in the UI, never as a fact.
   */
  tdsMgLApprox: number
}

/** Forward direction: doses in, resulting profile out. */
export function profileFromDoses(doses: SaltDoses, baseline?: Partial<WaterProfile>): WaterProfile {
  let gh = baseline?.ghPpmCaCO3 ?? 0
  let kh = baseline?.khPpmCaCO3 ?? 0
  let na = baseline?.sodiumMgL ?? 0
  let k = baseline?.potassiumMgL ?? 0
  let tds = baseline?.tdsMgLApprox ?? 0

  for (const [name, gPerL] of Object.entries(doses) as [SaltName, number | undefined][]) {
    if (!gPerL) continue
    if (gPerL < 0) throw new RangeError(`${name}: dose must be >= 0`)
    const c = SALT_CONTRIBUTION[name]
    gh += c.ghPpm * gPerL
    kh += c.khPpm * gPerL
    na += c.sodiumMgL * gPerL
    k += c.potassiumMgL * gPerL
    tds += gPerL * 1000 * c.dissolvedFraction
  }
  return {
    ghPpmCaCO3: gh,
    khPpmCaCO3: kh,
    sodiumMgL: na,
    potassiumMgL: k,
    tdsMgLApprox: tds,
  }
}

export type BuildRequest = {
  targetGhPpm: number
  targetKhPpm: number
  /** Fraction of hardness from magnesium, 0..1. Default 1 = all Epsom. */
  magnesiumFraction?: number
  /** Which salt supplies the calcium share of hardness. */
  calciumSalt?: Extract<SaltName, 'calciumChloride' | 'gypsum'>
  /** Which salt supplies alkalinity. */
  bicarbSalt?: Extract<SaltName, 'sodiumBicarb' | 'potassiumBicarb'>
}

/**
 * Reverse direction: target profile in, salt doses out (PRD F7 R4).
 *
 * Each salt contributes to exactly one of GH or KH, so this is division, not a
 * solver. Resisting the urge to write a least-squares fit for a 2x2 diagonal
 * system is the whole trick.
 */
export function dosesForTarget(req: BuildRequest): {
  doses: SaltDoses
  profile: WaterProfile
  warnings: string[]
} {
  const mgFraction = req.magnesiumFraction ?? 1
  if (mgFraction < 0 || mgFraction > 1) throw new RangeError('magnesiumFraction must be 0..1')
  if (req.targetGhPpm < 0 || req.targetKhPpm < 0) throw new RangeError('targets must be >= 0')

  const calciumSalt = req.calciumSalt ?? 'calciumChloride'
  const bicarbSalt = req.bicarbSalt ?? 'sodiumBicarb'

  const doses: SaltDoses = {}
  const mgShare = req.targetGhPpm * mgFraction
  const caShare = req.targetGhPpm * (1 - mgFraction)

  if (mgShare > 0) doses.epsom = mgShare / SALT_CONTRIBUTION.epsom.ghPpm
  if (caShare > 0) doses[calciumSalt] = caShare / SALT_CONTRIBUTION[calciumSalt].ghPpm
  if (req.targetKhPpm > 0) {
    doses[bicarbSalt] = req.targetKhPpm / SALT_CONTRIBUTION[bicarbSalt].khPpm
  }

  const profile = profileFromDoses(doses)
  return { doses, profile, warnings: profileWarnings(profile) }
}

/** PRD F7 R8 and F7.4 — flag anything outside the SCA acceptable range. */
export function profileWarnings(p: WaterProfile): string[] {
  const w: string[] = []
  const { ghPpmCaCO3: gh, khPpmCaCO3: kh, tdsMgLApprox: tds } = p

  if (gh < SCA_ACCEPTABLE.ghPpmCaCO3.min) {
    w.push('Hardness below the SCA range: expect a thin, hollow cup and poor extraction.')
  }
  if (gh > SCA_ACCEPTABLE.ghPpmCaCO3.max) {
    w.push('Hardness above the SCA range: risk of a harsh cup and limescale in equipment.')
  }
  if (kh === 0 && gh > 0) {
    w.push('Zero alkalinity: acidity will be unbuffered and may taste sharp or aggressive.')
  }
  if (kh > 70) {
    w.push('High alkalinity: acids will be buffered and the cup will likely taste flat or chalky.')
  }
  if (gh === 0 && kh === 0) {
    w.push('Distilled or RO water alone extracts poorly and tastes flat. Add minerals.')
  }
  if (tds > SCA_ACCEPTABLE.tdsMgL.max) {
    w.push('Estimated TDS above the SCA range.')
  }
  return w
}

/**
 * Concentrate helper: build a stock at `strength`x, then dose it by volume.
 * Returns grams of each salt per litre of concentrate, and the mL of concentrate
 * to add per litre of brew water.
 */
export function asConcentrate(
  doses: SaltDoses,
  strength: number,
): { perLitreOfConcentrate: SaltDoses; mlPerLitreOfBrewWater: number } {
  if (strength <= 1) throw new RangeError('concentrate strength must be > 1')
  const scaled: SaltDoses = {}
  for (const [name, gPerL] of Object.entries(doses) as [SaltName, number | undefined][]) {
    if (gPerL) scaled[name] = gPerL * strength
  }
  return { perLitreOfConcentrate: scaled, mlPerLitreOfBrewWater: 1000 / strength }
}

/**
 * Blend calculator (PRD F7 R5): what fraction of the mineral-rich source to mix
 * with a zero-hardness source to hit a target hardness.
 */
export function blendFraction(sourceGhPpm: number, targetGhPpm: number): number {
  if (sourceGhPpm <= 0) throw new RangeError('source hardness must be > 0')
  if (targetGhPpm > sourceGhPpm) {
    throw new RangeError('target exceeds the source: dilution cannot add hardness')
  }
  return targetGhPpm / sourceGhPpm
}
