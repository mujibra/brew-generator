import { describe, expect, it } from 'vitest'
import { type ScalableRecipe, bloomWaterFor, scaleToDose, scaleToWater } from './scaling'

/** The Hoffmann-style V60 in the PRD F2.3 acceptance criterion. */
const v60: ScalableRecipe = {
  doseG: 30,
  waterG: 500,
  bloomWaterG: 60,
  totalTimeS: 210, // 3:30
  geometry: 'cone',
  validDoseG: { min: 12, max: 40 },
}

describe('scaleToDose', () => {
  // PRD F2.3: 30 g / 500 g down to 15 g / 250 g, with proportional bloom and a
  // documented (non-linear) time adjustment.
  it('halves dose and water, halves bloom, and shortens time sub-linearly', () => {
    const r = scaleToDose(v60, 15)
    expect(r.doseG).toBe(15)
    expect(r.waterG).toBeCloseTo(250, 6)
    expect(r.bloomWaterG).toBeCloseTo(30, 6)
    expect(r.ratio).toBeCloseTo(16.667, 3)

    // Time must shrink, but by much less than half: 0.5^(1/3) = 0.7937
    expect(r.timeFactor).toBeCloseTo(0.7937, 4)
    expect(r.totalTimeS).toBeCloseTo(210 * 0.7937, 2)
    expect(r.totalTimeS).toBeGreaterThan(105)
  })

  it('keeps bloom tied to dose, never to total yield', () => {
    const r = scaleToDose(v60, 20)
    expect(r.bloomWaterG).toBeCloseTo(40, 6)
    // If bloom had scaled with water it would be 60 * (333/500) = 40 here by
    // coincidence, so check a ratio change too:
    const wide = scaleToDose({ ...v60, waterG: 600 }, 20)
    expect(wide.bloomWaterG).toBeCloseTo(40, 6)
  })

  it('scales flat-bottom time more aggressively than a cone', () => {
    const cone = scaleToDose(v60, 60)
    const flat = scaleToDose({ ...v60, geometry: 'flatBottom' }, 60)
    expect(flat.timeFactor).toBeGreaterThan(cone.timeFactor)
  })

  it('does not scale immersion time at all', () => {
    const r = scaleToDose({ ...v60, geometry: 'immersion' }, 60)
    expect(r.timeFactor).toBe(1)
    expect(r.totalTimeS).toBe(210)
  })

  it('warns when the target dose leaves the brewer band', () => {
    const r = scaleToDose(v60, 55)
    expect(r.warnings.join(' ')).toMatch(/validated/i)
  })

  it('warns when scaling beyond 2x', () => {
    expect(scaleToDose(v60, 70).warnings.join(' ')).toMatch(/2x/i)
    expect(scaleToDose(v60, 24).warnings).toEqual([])
  })

  it('clamps and reports a source bloom outside the 2-3x band', () => {
    const r = scaleToDose({ ...v60, bloomWaterG: 150 }, 30) // 5x dose
    expect(r.bloomWaterG).toBeCloseTo(90, 6) // clamped to 3x
    expect(r.warnings.join(' ')).toMatch(/bloom/i)
  })

  it('rejects a non-positive dose', () => {
    expect(() => scaleToDose(v60, 0)).toThrow(RangeError)
  })
})

describe('scaleToWater', () => {
  it('is the same operation entered from the yield side', () => {
    // Float tolerance, not toEqual: 250 / (500/30) is 14.999999999999998.
    const byWater = scaleToWater(v60, 250)
    const byDose = scaleToDose(v60, 15)
    expect(byWater.doseG).toBeCloseTo(byDose.doseG, 9)
    expect(byWater.waterG).toBeCloseTo(byDose.waterG, 9)
    expect(byWater.bloomWaterG).toBeCloseTo(byDose.bloomWaterG, 9)
    expect(byWater.totalTimeS).toBeCloseTo(byDose.totalTimeS, 9)
    expect(byWater.warnings).toEqual(byDose.warnings)
  })
})

describe('bloomWaterFor', () => {
  it('clamps to the 2-3x band', () => {
    expect(bloomWaterFor(20, 1)).toBe(40)
    expect(bloomWaterFor(20, 5)).toBe(60)
    expect(bloomWaterFor(20, 2.5)).toBe(50)
  })
})
