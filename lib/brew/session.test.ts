import { describe, expect, it } from 'vitest'
import {
  MASS_TOLERANCE_G,
  advancePrep,
  beginBrew,
  chooseBean,
  finishBrew,
  newSession,
  pauseBrew,
  phaseOf,
  pourStatus,
  prepComplete,
  resumeBrew,
  rewindStep,
  viewOf,
} from './session'
import { type RecipeInput, compileRecipe } from './steps'

const T0 = 1_800_000_000_000

const recipe: RecipeInput = {
  doseG: 30,
  prep: [
    { kind: 'rinse', label: 'Rinse', instruction: 'Rinse the filter.' },
    { kind: 'dose', label: 'Dose', instruction: 'Add 30 g of coffee.' },
  ],
  steps: [
    { kind: 'bloom', toG: 60, durationS: 45 },
    { kind: 'pour', toG: 300, pourS: 30 },
    { kind: 'wait', durationS: 15 },
    { kind: 'pour', toG: 500, pourS: 30 },
    { kind: 'drain', expectedS: 90 },
  ],
}
const c = compileRecipe(recipe)
const at = (ms: number) => T0 + ms

describe('prep phase', () => {
  it('starts in prep and walks through each prep step', () => {
    let s = newSession('v60')
    expect(phaseOf(s, c, T0)).toBe('prep')
    expect(viewOf(s, c, T0).prep?.label).toBe('Rinse')

    s = advancePrep(s, c.prep.length)
    expect(viewOf(s, c, T0).prep?.label).toBe('Dose')
    expect(prepComplete(s, c.prep.length)).toBe(false)

    s = advancePrep(s, c.prep.length)
    expect(prepComplete(s, c.prep.length)).toBe(true)
    expect(phaseOf(s, c, T0)).toBe('brewing')
  })

  it('does not run past the last prep step', () => {
    let s = newSession('v60')
    for (let i = 0; i < 10; i++) s = advancePrep(s, c.prep.length)
    expect(s.prepIndex).toBe(2)
  })

  it('shows no elapsed time and no water target during prep', () => {
    const v = viewOf(newSession('v60'), c, T0)
    expect(v.elapsedS).toBe(0)
    expect(v.targetMassG).toBe(0)
  })
})

describe('brewing', () => {
  const started = beginBrew(newSession('v60'), T0)

  it('advances steps purely from elapsed time', () => {
    expect(viewOf(started, c, at(0)).step?.kind).toBe('bloom')
    expect(viewOf(started, c, at(50_000)).step?.kind).toBe('pour')
    expect(viewOf(started, c, at(80_000)).step?.kind).toBe('wait')
    expect(viewOf(started, c, at(100_000)).step?.kind).toBe('pour')
    expect(viewOf(started, c, at(150_000)).step?.kind).toBe('drain')
  })

  it('exposes the next step for the preview line', () => {
    expect(viewOf(started, c, at(0)).nextStep?.kind).toBe('pour')
    expect(viewOf(started, c, at(150_000)).nextStep).toBeUndefined()
    expect(viewOf(started, c, at(150_000)).isLastStep).toBe(true)
  })

  it('gives a live mass target that ramps through a pour', () => {
    expect(viewOf(started, c, at(90_000)).targetMassG).toBeCloseTo(300, 6)
    expect(viewOf(started, c, at(105_000)).targetMassG).toBeCloseTo(400, 6)
    expect(viewOf(started, c, at(120_000)).targetMassG).toBeCloseTo(500, 6)
  })

  it('counts down to the step boundary and goes negative on overrun', () => {
    expect(viewOf(started, c, at(40_000)).secondsToStepEnd).toBeCloseTo(5, 6)
    // Still inside the final drain step at 200 s of a 210 s recipe
    expect(viewOf(started, c, at(200_000)).secondsToStepEnd).toBeCloseTo(10, 6)
    expect(viewOf(started, c, at(230_000)).secondsToStepEnd).toBeLessThan(0)
  })

  it('reports progress through the step and the whole brew', () => {
    const v = viewOf(started, c, at(22_500))
    expect(v.stepProgress).toBeCloseTo(0.5, 6)
    expect(v.brewProgress).toBeCloseTo(22.5 / 210, 6)
    expect(viewOf(started, c, at(999_000)).brewProgress).toBe(1)
  })

  // PRD F1 R6 — the requirement that shapes the whole module.
  it('survives a serialise and restore mid-brew with no tick history', () => {
    const restored = JSON.parse(JSON.stringify(started))
    const v = viewOf(restored, c, at(105_000))
    expect(v.elapsedS).toBeCloseTo(105, 6)
    expect(v.targetMassG).toBeCloseTo(400, 6)
    expect(v.step?.kind).toBe('pour')
  })
})

describe('pause, resume, finish', () => {
  it('freezes elapsed time and the mass target while paused', () => {
    let s = beginBrew(newSession('v60'), T0)
    s = pauseBrew(s, at(60_000))
    expect(phaseOf(s, c, at(200_000))).toBe('paused')

    const v = viewOf(s, c, at(200_000))
    expect(v.elapsedS).toBeCloseTo(60, 6)
    expect(v.targetMassG).toBeCloseTo(180, 6) // halfway through the 60->300 pour

    s = resumeBrew(s, at(200_000))
    expect(viewOf(s, c, at(210_000)).elapsedS).toBeCloseTo(70, 6)
  })

  it('stays done once finished', () => {
    const s = finishBrew(beginBrew(newSession('v60'), T0), at(210_000))
    expect(phaseOf(s, c, at(999_000))).toBe('done')
    expect(viewOf(s, c, at(999_000)).elapsedS).toBeCloseTo(210, 6)
  })
})

describe('rewindStep', () => {
  it('moves back to the start of the previous step', () => {
    const s = beginBrew(newSession('v60'), T0)
    const rewound = rewindStep(s, c, at(100_000)) // inside the second pour, starts at 90 s
    expect(viewOf(rewound, c, at(100_000)).elapsedS).toBeCloseTo(75, 6) // wait step start
    expect(viewOf(rewound, c, at(100_000)).step?.kind).toBe('wait')
  })

  it('does nothing on the first step', () => {
    const s = beginBrew(newSession('v60'), T0)
    expect(rewindStep(s, c, at(10_000))).toBe(s)
  })
})

describe('pourStatus', () => {
  const started = beginBrew(newSession('v60'), T0)
  const view = viewOf(started, c, at(105_000)) // target 400 g, mid-pour

  it('is on target inside the tolerance band', () => {
    expect(pourStatus(view, 400)).toBe('onTarget')
    expect(pourStatus(view, 400 + MASS_TOLERANCE_G)).toBe('onTarget')
  })

  it('detects ahead and behind outside the band', () => {
    expect(pourStatus(view, 420)).toBe('ahead')
    expect(pourStatus(view, 380)).toBe('behind')
  })

  it('says nothing when not pouring or with no scale', () => {
    expect(pourStatus(view, undefined)).toBe('notPouring')
    expect(pourStatus(viewOf(started, c, at(80_000)), 300)).toBe('notPouring')
  })
})

describe('bean selection', () => {
  it('records which bag is being brewed', () => {
    const s = chooseBean(newSession('v60'), 'bean-kenya')
    expect(s.beanId).toBe('bean-kenya')
  })

  it('clears cleanly, leaving no empty key behind', () => {
    const s = chooseBean(chooseBean(newSession('v60'), 'bean-kenya'), undefined)
    expect(s.beanId).toBeUndefined()
    expect('beanId' in s).toBe(false)
  })

  // The session is persisted every tick, so the bag survives a reload mid-brew.
  it('survives a serialise and restore', () => {
    const s = beginBrew(chooseBean(newSession('v60'), 'bean-kenya'), T0)
    const restored = JSON.parse(JSON.stringify(s))
    expect(restored.beanId).toBe('bean-kenya')
    expect(viewOf(restored, c, at(50_000)).step?.kind).toBe('pour')
  })
})
