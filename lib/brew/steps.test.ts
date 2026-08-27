import { describe, expect, it } from 'vitest'
import { type RecipeInput, compileRecipe, stepIndexAt, targetFlowAt, targetMassAt } from './steps'

/** A Hoffmann-shaped V60: bloom, two pours, swirl, drain. */
const v60: RecipeInput = {
  doseG: 30,
  prep: [{ kind: 'rinse', label: 'Rinse', instruction: 'Rinse the filter and preheat.' }],
  steps: [
    { kind: 'bloom', toG: 60, durationS: 45 },
    { kind: 'pour', toG: 300, pourS: 30 },
    { kind: 'wait', durationS: 15 },
    { kind: 'pour', toG: 500, pourS: 30 },
    { kind: 'agitate', style: 'swirl', durationS: 10 },
    { kind: 'drain', expectedS: 80 },
    { kind: 'serve' },
  ],
}

describe('compileRecipe', () => {
  it('lays steps out on an absolute timeline', () => {
    const c = compileRecipe(v60)
    expect(c.steps.map((s) => [s.startS, s.endS])).toEqual([
      [0, 45],
      [45, 75],
      [75, 90],
      [90, 120],
      [120, 130],
      [130, 210],
      [210, 210],
    ])
    expect(c.totalS).toBe(210) // 3:30
    expect(c.totalWaterG).toBe(500)
  })

  it('treats pour targets as cumulative, not incremental', () => {
    const c = compileRecipe(v60)
    const secondPour = c.steps[3]!
    expect(secondPour.waterFromG).toBe(300)
    expect(secondPour.waterToG).toBe(500)
  })

  it('marks only water-adding steps as pouring', () => {
    const c = compileRecipe(v60)
    expect(c.steps.filter((s) => s.pouring).map((s) => s.kind)).toEqual(['bloom', 'pour', 'pour'])
  })

  it('derives bloom water from a dose multiple when no absolute target is given', () => {
    const c = compileRecipe({
      doseG: 20,
      steps: [{ kind: 'bloom', multiple: 3, durationS: 45 }],
    })
    expect(c.steps[0]!.waterToG).toBe(60)
  })

  it('defaults bloom to twice the dose', () => {
    const c = compileRecipe({ doseG: 15, steps: [{ kind: 'bloom', durationS: 30 }] })
    expect(c.steps[0]!.waterToG).toBe(30)
  })

  it('marks drain as user-terminated because a clock cannot know', () => {
    const c = compileRecipe(v60)
    expect(c.steps[5]!.userTerminated).toBe(true)
    expect(c.steps[1]!.userTerminated).toBe(false)
  })

  it('carries prep steps through untouched', () => {
    expect(compileRecipe(v60).prep).toHaveLength(1)
  })

  it('rejects a pour that goes backwards', () => {
    expect(() =>
      compileRecipe({
        doseG: 30,
        steps: [
          { kind: 'pour', toG: 300, pourS: 30 },
          { kind: 'pour', toG: 200, pourS: 30 },
        ],
      }),
    ).toThrow(/cumulative/)
  })

  it('rejects a non-positive dose', () => {
    expect(() => compileRecipe({ doseG: 0, steps: [] })).toThrow(RangeError)
  })
})

describe('targetMassAt', () => {
  const c = compileRecipe(v60)

  it('starts at zero and ends at the full recipe water', () => {
    expect(targetMassAt(c, 0)).toBe(0)
    expect(targetMassAt(c, -5)).toBe(0)
    expect(targetMassAt(c, 210)).toBe(500)
    expect(targetMassAt(c, 999)).toBe(500)
  })

  it('ramps linearly through a bloom', () => {
    expect(targetMassAt(c, 22.5)).toBeCloseTo(30, 6) // halfway to 60 g
    expect(targetMassAt(c, 45)).toBeCloseTo(60, 6)
  })

  it('ramps linearly through a pour', () => {
    // Second pour: 300 -> 500 g across 90..120 s
    expect(targetMassAt(c, 90)).toBeCloseTo(300, 6)
    expect(targetMassAt(c, 105)).toBeCloseTo(400, 6)
    expect(targetMassAt(c, 120)).toBeCloseTo(500, 6)
  })

  it('holds flat while waiting, swirling, and draining', () => {
    expect(targetMassAt(c, 80)).toBe(300) // wait
    expect(targetMassAt(c, 125)).toBe(500) // swirl
    expect(targetMassAt(c, 180)).toBe(500) // drain
  })

  it('never goes backwards across the whole brew', () => {
    let previous = -1
    for (let t = 0; t <= 220; t += 0.5) {
      const m = targetMassAt(c, t)
      expect(m).toBeGreaterThanOrEqual(previous)
      previous = m
    }
  })
})

describe('stepIndexAt', () => {
  const c = compileRecipe(v60)

  it('finds the step covering a time', () => {
    expect(stepIndexAt(c, 0)).toBe(0)
    expect(stepIndexAt(c, 44)).toBe(0)
    expect(stepIndexAt(c, 45)).toBe(1)
    expect(stepIndexAt(c, 100)).toBe(3)
    expect(stepIndexAt(c, 200)).toBe(5)
  })

  it('clamps past the end rather than returning nothing', () => {
    expect(stepIndexAt(c, 9999)).toBe(c.steps.length - 1)
  })

  it('returns -1 for an empty recipe', () => {
    expect(stepIndexAt(compileRecipe({ doseG: 15, steps: [] }), 5)).toBe(-1)
  })
})

describe('targetFlowAt', () => {
  const c = compileRecipe(v60)

  it('reports grams per second during a pour', () => {
    // 200 g over 30 s
    expect(targetFlowAt(c, 100)).toBeCloseTo(6.667, 3)
  })

  it('reports zero when not pouring', () => {
    expect(targetFlowAt(c, 80)).toBe(0)
    expect(targetFlowAt(c, 180)).toBe(0)
  })
})
