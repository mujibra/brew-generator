import { describe, expect, it } from 'vitest'
import {
  GOLDEN_CUP,
  beverageMass,
  controlChartZone,
  extractionYield,
  ratio,
  tdsForTargetEy,
} from './extraction'

describe('beverageMass', () => {
  it('prefers a measured value and tags it as measured', () => {
    expect(beverageMass({ measuredG: 420, totalWaterG: 500, doseG: 30 })).toEqual({
      kind: 'measured',
      grams: 420,
    })
  })

  it('estimates from LRR and tags it as estimated', () => {
    // 500 - 30 * 2.0 = 440
    expect(beverageMass({ totalWaterG: 500, doseG: 30, method: 'paperCone' })).toEqual({
      kind: 'estimated',
      grams: 440,
      lrr: 2.0,
    })
  })

  it('uses a different LRR per method family', () => {
    const press = beverageMass({ totalWaterG: 250, doseG: 15, method: 'pressed' })
    expect(press.grams).toBeCloseTo(250 - 15 * 1.8, 6)
  })

  it('refuses a dose that absorbs all the water', () => {
    expect(() => beverageMass({ totalWaterG: 40, doseG: 30 })).toThrow(RangeError)
  })
})

describe('extractionYield', () => {
  it('computes EY from TDS and a measured beverage mass', () => {
    // 1.35% of 420 g = 5.67 g dissolved, from a 30 g dose = 18.9%
    const b = beverageMass({ measuredG: 420, totalWaterG: 500, doseG: 30 })
    const result = extractionYield({ tdsPct: 1.35, doseG: 30, beverage: b })
    expect(result.eyPct).toBeCloseTo(18.9, 6)
    expect(result.estimated).toBe(false)
  })

  it('flags EY derived from an estimated beverage mass', () => {
    const b = beverageMass({ totalWaterG: 500, doseG: 30 })
    expect(extractionYield({ tdsPct: 1.35, doseG: 30, beverage: b }).estimated).toBe(true)
  })

  it('round-trips against tdsForTargetEy', () => {
    const tds = tdsForTargetEy({ targetEyPct: 20, doseG: 30, beverageG: 440 })
    const b = beverageMass({ measuredG: 440, totalWaterG: 500, doseG: 30 })
    expect(extractionYield({ tdsPct: tds, doseG: 30, beverage: b }).eyPct).toBeCloseTo(20, 9)
  })
})

describe('controlChartZone', () => {
  it('puts a Golden Cup brew in the ideal box', () => {
    expect(controlChartZone(20, 1.25)).toBe('ideal')
  })

  it('separates the two axes rather than conflating them', () => {
    expect(controlChartZone(15, 0.9)).toBe('under-weak')
    expect(controlChartZone(15, 1.5)).toBe('under-strong')
    expect(controlChartZone(24, 0.9)).toBe('over-weak')
    expect(controlChartZone(24, 1.5)).toBe('over-strong')
  })

  it('reports a single-axis problem when the other axis is fine', () => {
    expect(controlChartZone(15, 1.25)).toBe('under')
    expect(controlChartZone(24, 1.25)).toBe('over')
    expect(controlChartZone(20, 0.9)).toBe('weak')
    expect(controlChartZone(20, 1.5)).toBe('strong')
  })

  it('treats the Golden Cup bounds as inclusive', () => {
    expect(controlChartZone(GOLDEN_CUP.ey.min, GOLDEN_CUP.tds.min)).toBe('ideal')
    expect(controlChartZone(GOLDEN_CUP.ey.max, GOLDEN_CUP.tds.max)).toBe('ideal')
  })
})

describe('ratio', () => {
  it('treats ratio as water:coffee', () => {
    expect(ratio.fromDoseWater(30, 500)).toBeCloseTo(16.667, 3)
    expect(ratio.waterFor(15, 16)).toBe(240)
    expect(ratio.doseFor(500, 16)).toBeCloseTo(31.25, 6)
  })

  it('converts to the g/L unit the SCA standard uses', () => {
    // The SCA target of 55 g/L is a 1:18.18 ratio
    expect(ratio.fromGramsPerLitre(55)).toBeCloseTo(18.18, 2)
    expect(ratio.toGramsPerLitre(16)).toBeCloseTo(62.5, 6)
  })

  it('places the common 1:15-1:17 band above the SCA target strength', () => {
    expect(ratio.toGramsPerLitre(15)).toBeGreaterThan(GOLDEN_CUP.strengthGPerL.max)
    expect(ratio.toGramsPerLitre(17)).toBeGreaterThan(GOLDEN_CUP.strengthGPerL.target)
  })
})
