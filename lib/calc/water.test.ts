import { describe, expect, it } from 'vitest'
import {
  SALT_CONTRIBUTION,
  SCA_ACCEPTABLE,
  SCA_TARGET,
  asConcentrate,
  blendFraction,
  dosesForTarget,
  profileFromDoses,
  profileWarnings,
} from './water'

describe('salt contribution constants', () => {
  // Spot-checks against hand-computed molar arithmetic. If these drift, the
  // molar masses were edited wrongly and every water recipe silently breaks.
  it('derives Epsom hardness from molar mass', () => {
    // Mg 24.305 / MgSO4.7H2O 246.475 = 98.6 mg/L Mg per g/L, x 4.118 as CaCO3
    expect(SALT_CONTRIBUTION.epsom.ghPpm).toBeCloseTo(406.1, 0)
    expect(SALT_CONTRIBUTION.epsom.khPpm).toBe(0)
  })

  it('derives calcium chloride and gypsum hardness', () => {
    expect(SALT_CONTRIBUTION.calciumChloride.ghPpm).toBeCloseTo(680.8, 0)
    expect(SALT_CONTRIBUTION.gypsum.ghPpm).toBeCloseTo(581.5, 0)
  })

  it('derives bicarbonate alkalinity', () => {
    expect(SALT_CONTRIBUTION.sodiumBicarb.khPpm).toBeCloseTo(595.7, 0)
    expect(SALT_CONTRIBUTION.potassiumBicarb.khPpm).toBeCloseTo(499.9, 0)
    expect(SALT_CONTRIBUTION.sodiumBicarb.ghPpm).toBe(0)
  })
})

describe('dosesForTarget', () => {
  // PRD F7.4: given GH 68 / KH 40 and Epsom + bicarbonate, the recomputed
  // profile must land within 5 % of target.
  it('hits the SCA target within 5 %', () => {
    const { doses, profile } = dosesForTarget({
      targetGhPpm: SCA_TARGET.ghPpmCaCO3,
      targetKhPpm: SCA_TARGET.khPpmCaCO3,
    })
    expect(profile.ghPpmCaCO3).toBeCloseTo(68, 6)
    expect(profile.khPpmCaCO3).toBeCloseTo(40, 6)
    expect(Math.abs(profile.ghPpmCaCO3 - 68) / 68).toBeLessThan(0.05)
    expect(Math.abs(profile.khPpmCaCO3 - 40) / 40).toBeLessThan(0.05)
    // Sanity: these are tenths of a gram per litre, as real recipes are.
    expect(doses.epsom).toBeGreaterThan(0)
    expect(doses.epsom).toBeLessThan(1)
    expect(doses.sodiumBicarb).toBeGreaterThan(0)
    expect(doses.sodiumBicarb).toBeLessThan(1)
  })

  it('splits hardness between magnesium and calcium', () => {
    const { doses, profile } = dosesForTarget({
      targetGhPpm: 80,
      targetKhPpm: 40,
      magnesiumFraction: 0.5,
    })
    expect(profile.ghPpmCaCO3).toBeCloseTo(80, 6)
    expect(doses.epsom).toBeGreaterThan(0)
    expect(doses.calciumChloride).toBeGreaterThan(0)
  })

  it('omits a salt whose share is zero', () => {
    const { doses } = dosesForTarget({ targetGhPpm: 68, targetKhPpm: 0 })
    expect(doses.sodiumBicarb).toBeUndefined()
    expect(doses.epsom).toBeGreaterThan(0)
  })

  it('carries sodium through when sodium bicarbonate supplies alkalinity', () => {
    const { profile } = dosesForTarget({ targetGhPpm: 68, targetKhPpm: 40 })
    expect(profile.sodiumMgL).toBeGreaterThan(0)
    const potassium = dosesForTarget({
      targetGhPpm: 68,
      targetKhPpm: 40,
      bicarbSalt: 'potassiumBicarb',
    })
    expect(potassium.profile.sodiumMgL).toBe(0)
    expect(potassium.profile.potassiumMgL).toBeGreaterThan(0)
  })

  it('rejects a nonsense magnesium fraction', () => {
    expect(() =>
      dosesForTarget({ targetGhPpm: 68, targetKhPpm: 40, magnesiumFraction: 1.5 }),
    ).toThrow(RangeError)
  })

  it('round-trips through profileFromDoses', () => {
    const { doses, profile } = dosesForTarget({ targetGhPpm: 75, targetKhPpm: 25 })
    expect(profileFromDoses(doses)).toEqual(profile)
  })
})

describe('profileWarnings', () => {
  it('says nothing about a profile at the SCA target', () => {
    const { warnings } = dosesForTarget({ targetGhPpm: 68, targetKhPpm: 40 })
    expect(warnings).toEqual([])
  })

  it('warns about hard tap water on both hardness and flatness', () => {
    // PRD F7.4: GH 250 / KH 180 must produce a specific, actionable warning.
    const w = profileWarnings({
      ghPpmCaCO3: 250,
      khPpmCaCO3: 180,
      sodiumMgL: 0,
      potassiumMgL: 0,
      tdsMgLApprox: 430,
    })
    expect(w.join(' ')).toMatch(/limescale/i)
    expect(w.join(' ')).toMatch(/flat|chalky/i)
    expect(w.length).toBeGreaterThanOrEqual(2)
  })

  it('warns that distilled water alone extracts poorly', () => {
    const w = profileWarnings({
      ghPpmCaCO3: 0,
      khPpmCaCO3: 0,
      sodiumMgL: 0,
      potassiumMgL: 0,
      tdsMgLApprox: 0,
    })
    expect(w.join(' ')).toMatch(/distilled|RO/i)
  })

  it('warns about unbuffered acidity at zero alkalinity', () => {
    const { warnings } = dosesForTarget({ targetGhPpm: 68, targetKhPpm: 0 })
    expect(warnings.join(' ')).toMatch(/unbuffered|sharp/i)
  })
})

describe('asConcentrate', () => {
  it('scales doses and returns the volume to add per litre', () => {
    const { doses } = dosesForTarget({ targetGhPpm: 68, targetKhPpm: 40 })
    const c = asConcentrate(doses, 100)
    expect(c.mlPerLitreOfBrewWater).toBe(10)
    expect(c.perLitreOfConcentrate.epsom).toBeCloseTo((doses.epsom ?? 0) * 100, 9)
  })

  it('refuses a concentrate weaker than the working solution', () => {
    expect(() => asConcentrate({ epsom: 0.1 }, 1)).toThrow(RangeError)
  })
})

describe('blendFraction', () => {
  it('halves a source that is twice the target hardness', () => {
    expect(blendFraction(136, 68)).toBeCloseTo(0.5, 9)
  })

  it('refuses to invent hardness by dilution', () => {
    expect(() => blendFraction(50, 68)).toThrow(RangeError)
  })
})

describe('TDS excludes water of crystallisation', () => {
  // The bug this guards: summing weighed salt mass counts the 7 water molecules
  // in MgSO4*7H2O as dissolved solids, overstating TDS by more than half.
  it('reports only the dissolved ion mass for Epsom salt', () => {
    // Mg 24.305 + SO4 96.06 = 120.365 of MW 246.475 = 48.8 %
    expect(SALT_CONTRIBUTION.epsom.dissolvedFraction).toBeCloseTo(0.4883, 3)
  })

  it('treats anhydrous bicarbonates as fully dissolving', () => {
    expect(SALT_CONTRIBUTION.sodiumBicarb.dissolvedFraction).toBe(1)
    expect(SALT_CONTRIBUTION.potassiumBicarb.dissolvedFraction).toBe(1)
  })

  it('discounts the hydrated calcium salts too', () => {
    expect(SALT_CONTRIBUTION.calciumChloride.dissolvedFraction).toBeCloseTo(0.755, 2)
    expect(SALT_CONTRIBUTION.gypsum.dissolvedFraction).toBeCloseTo(0.791, 2)
  })

  // The strongest check available: the SCA publishes GH 68, KH 40 AND TDS 150
  // for the same target water. If the model is right those must agree.
  it('lands within 10 % of the SCA published TDS at the SCA published hardness', () => {
    const { profile } = dosesForTarget({
      targetGhPpm: SCA_TARGET.ghPpmCaCO3,
      targetKhPpm: SCA_TARGET.khPpmCaCO3,
    })
    expect(profile.tdsMgLApprox).toBeGreaterThan(SCA_TARGET.tdsMgL * 0.9)
    expect(profile.tdsMgLApprox).toBeLessThan(SCA_TARGET.tdsMgL * 1.1)
  })

  it('no longer double-counts, so TDS sits inside the SCA acceptable range', () => {
    const { profile, warnings } = dosesForTarget({ targetGhPpm: 68, targetKhPpm: 40 })
    expect(profile.tdsMgLApprox).toBeLessThan(SCA_ACCEPTABLE.tdsMgL.max)
    expect(warnings.join(' ')).not.toMatch(/TDS/)
  })
})
