import type { BrewRecord } from '@/lib/db/repository'
import { describe, expect, it } from 'vitest'
import {
  applyGrindMove,
  attemptsFromBrews,
  baselineCount,
  baselineFor,
  clearPending,
  drawdownFromBrew,
  emptyGear,
  grinderOf,
  lastGrindSetting,
  mostRecentBrew,
  setBaseline,
  setGrinder,
  setPending,
  symptomFromBrew,
} from './store'

const NOW = 1_800_000_000_000

function brew(over: Partial<BrewRecord> = {}): BrewRecord {
  return {
    id: over.id ?? `b${Math.random()}`,
    updatedAt: 0,
    startedAt: NOW,
    doseG: 20,
    waterG: 320,
    totalTimeS: 210,
    ...over,
  }
}

describe('gear defaults', () => {
  it('starts empty and knows nothing', () => {
    const gear = emptyGear(NOW)
    expect(grinderOf(gear)).toBeUndefined()
    expect(baselineFor(gear, 'v60')).toBeUndefined()
    expect(baselineCount(gear)).toBe(0)
  })

  it('tolerates being asked about gear that does not exist yet', () => {
    expect(grinderOf(undefined)).toBeUndefined()
    expect(baselineFor(undefined, 'v60')).toBeUndefined()
    expect(baselineCount(undefined)).toBe(0)
  })
})

describe('grinder selection', () => {
  it('resolves a known grinder', () => {
    const gear = setGrinder(emptyGear(NOW), 'timemore-s3')
    expect(grinderOf(gear)?.name).toBe('Timemore Chestnut S3')
    expect(grinderOf(gear)?.micronsPerUnit).toBe(15)
  })

  // The baselines were in the old grinder's clicks. Keeping them would be worse
  // than having none, because the advice would be confidently wrong.
  it('discards baselines when the grinder changes', () => {
    let gear = setGrinder(emptyGear(NOW), 'comandante-c40')
    gear = setBaseline(gear, 'v60', 28)
    gear = setBaseline(gear, 'chemex', 32)
    expect(baselineCount(gear)).toBe(2)

    gear = setGrinder(gear, 'timemore-s3')
    expect(baselineCount(gear)).toBe(0)
  })

  it('keeps baselines when the grinder is re-set to the same one', () => {
    let gear = setGrinder(emptyGear(NOW), 'comandante-c40')
    gear = setBaseline(gear, 'v60', 28)
    gear = setGrinder(gear, 'comandante-c40')
    expect(baselineFor(gear, 'v60')).toBe(28)
  })

  it('clears the grinder and its baselines together', () => {
    let gear = setGrinder(emptyGear(NOW), 'comandante-c40')
    gear = setBaseline(gear, 'v60', 28)
    gear = setGrinder(gear, undefined)
    expect(grinderOf(gear)).toBeUndefined()
    expect(baselineCount(gear)).toBe(0)
  })
})

describe('baselines', () => {
  it('stores one setting per brewer', () => {
    let gear = emptyGear(NOW)
    gear = setBaseline(gear, 'v60', 44)
    gear = setBaseline(gear, 'frenchPress', 68)
    expect(baselineFor(gear, 'v60')).toBe(44)
    expect(baselineFor(gear, 'frenchPress')).toBe(68)
    expect(baselineFor(gear, 'chemex')).toBeUndefined()
  })

  it('removes a baseline when cleared', () => {
    let gear = setBaseline(emptyGear(NOW), 'v60', 44)
    gear = setBaseline(gear, 'v60', undefined)
    expect(baselineFor(gear, 'v60')).toBeUndefined()
    expect(baselineCount(gear)).toBe(0)
  })

  it('ignores a non-finite setting rather than storing NaN', () => {
    const gear = setBaseline(emptyGear(NOW), 'v60', Number.NaN)
    expect(baselineFor(gear, 'v60')).toBeUndefined()
  })

  it('does not mutate the record it was given', () => {
    const gear = emptyGear(NOW)
    setBaseline(gear, 'v60', 44)
    expect(baselineCount(gear)).toBe(0)
  })
})

describe('pending dial-in suggestion', () => {
  it('records what the user said they would try', () => {
    const gear = setPending(emptyGear(NOW), 'grindTooCoarse', 'Grind 3 clicks finer', NOW)
    expect(gear.pendingHypothesis).toEqual({
      id: 'grindTooCoarse',
      action: 'Grind 3 clicks finer',
      setAt: NOW,
    })
  })

  it('clears cleanly, leaving no empty key behind', () => {
    const gear = clearPending(setPending(emptyGear(NOW), 'grindTooCoarse', 'x', NOW))
    expect(gear.pendingHypothesis).toBeUndefined()
    expect('pendingHypothesis' in gear).toBe(false)
  })
})

describe('attemptsFromBrews', () => {
  it('derives history from the journal, oldest first', () => {
    const attempts = attemptsFromBrews([
      brew({ startedAt: NOW, dialInHypothesis: 'grindTooFine', dialInOutcome: 'better' }),
      brew({ startedAt: NOW - 2000, dialInHypothesis: 'grindTooCoarse', dialInOutcome: 'same' }),
      brew({ startedAt: NOW - 1000, dialInHypothesis: 'grindTooCoarse', dialInOutcome: 'worse' }),
    ])
    expect(attempts).toEqual([
      { hypothesis: 'grindTooCoarse', outcome: 'same' },
      { hypothesis: 'grindTooCoarse', outcome: 'worse' },
      { hypothesis: 'grindTooFine', outcome: 'better' },
    ])
  })

  it('ignores brews with no verdict, and a hypothesis with no outcome', () => {
    expect(
      attemptsFromBrews([
        brew(),
        brew({ dialInHypothesis: 'grindTooCoarse' }),
        brew({ dialInOutcome: 'better' }),
      ]),
    ).toEqual([])
  })

  // The engine needs three consecutive 'same' on one hypothesis to escalate.
  // That only works if the journal actually reproduces the run in order.
  it('reproduces a trailing run the engine can act on', () => {
    const attempts = attemptsFromBrews(
      Array.from({ length: 3 }, (_, i) =>
        brew({ startedAt: NOW + i, dialInHypothesis: 'grindTooCoarse', dialInOutcome: 'same' }),
      ),
    )
    expect(attempts).toHaveLength(3)
    expect(attempts.every((a) => a.hypothesis === 'grindTooCoarse' && a.outcome === 'same')).toBe(
      true,
    )
  })
})

describe('drawdownFromBrew', () => {
  it('classifies against the recipe expected time', () => {
    expect(drawdownFromBrew(brew({ totalTimeS: 110 }), 210)).toBe('fast')
    expect(drawdownFromBrew(brew({ totalTimeS: 210 }), 210)).toBe('normal')
    expect(drawdownFromBrew(brew({ totalTimeS: 270 }), 210)).toBe('slow')
    expect(drawdownFromBrew(brew({ totalTimeS: 400 }), 210)).toBe('stalled')
  })

  it('says nothing without both numbers', () => {
    expect(drawdownFromBrew(undefined, 210)).toBeUndefined()
    expect(drawdownFromBrew(brew(), undefined)).toBeUndefined()
    expect(drawdownFromBrew(brew(), 0)).toBeUndefined()
  })
})

describe('mostRecentBrew', () => {
  it('finds the latest', () => {
    expect(
      mostRecentBrew([
        brew({ id: 'old', startedAt: 1 }),
        brew({ id: 'new', startedAt: 3 }),
        brew({ id: 'mid', startedAt: 2 }),
      ])?.id,
    ).toBe('new')
  })

  it('is undefined for an empty journal', () => {
    expect(mostRecentBrew([])).toBeUndefined()
  })
})

describe('symptomFromBrew', () => {
  it('reads the fault straight off the tags', () => {
    expect(symptomFromBrew(brew({ tags: ['sour'] }))).toBe('sour')
    expect(symptomFromBrew(brew({ tags: ['bitter'] }))).toBe('bitter')
    expect(symptomFromBrew(brew({ tags: ['thin'] }))).toBe('thin')
    expect(symptomFromBrew(brew({ tags: ['flat'] }))).toBe('flat')
  })

  // Praise is not a complaint, so there is nothing to diagnose.
  it('ignores positive tags', () => {
    expect(symptomFromBrew(brew({ tags: ['sweet', 'balanced', 'clean'] }))).toBeUndefined()
  })

  it('prefers astringency, which is the most specific signal', () => {
    expect(symptomFromBrew(brew({ tags: ['bitter', 'astringent'] }))).toBe('astringent')
  })

  it('says nothing without tags', () => {
    expect(symptomFromBrew(brew())).toBeUndefined()
    expect(symptomFromBrew(brew({ tags: [] }))).toBeUndefined()
    expect(symptomFromBrew(undefined)).toBeUndefined()
  })
})

describe('lastGrindSetting', () => {
  it('returns the setting from the most recent brew that recorded one', () => {
    expect(
      lastGrindSetting([
        brew({ startedAt: NOW - 2000, grindSetting: '62' }),
        brew({ startedAt: NOW, grindSetting: '66' }),
        brew({ startedAt: NOW - 1000, grindSetting: '64' }),
      ]),
    ).toBe('66')
  })

  // A French press number says nothing about your V60.
  it('scopes to a recipe when given one', () => {
    const brews = [
      brew({ startedAt: NOW, recipeId: 'french-press-clean', grindSetting: '90' }),
      brew({ startedAt: NOW - 1000, recipeId: 'v60-ultimate', grindSetting: '66' }),
    ]
    expect(lastGrindSetting(brews, 'v60-ultimate')).toBe('66')
    expect(lastGrindSetting(brews)).toBe('90')
  })

  it('ignores brews with no grind recorded', () => {
    expect(
      lastGrindSetting([brew({ startedAt: NOW }), brew({ startedAt: NOW - 1 })]),
    ).toBeUndefined()
  })
})

describe('applyGrindMove', () => {
  // Coarser is a higher number on every grinder in the registry.
  it('adds for coarser and subtracts for finer', () => {
    expect(applyGrindMove('66', { delta: 3, direction: 'coarser' })).toBe('69')
    expect(applyGrindMove('66', { delta: 3, direction: 'finer' })).toBe('63')
  })

  it('never goes below zero', () => {
    expect(applyGrindMove('2', { delta: 5, direction: 'finer' })).toBe('0')
  })

  it('says nothing without a starting point or a move', () => {
    expect(applyGrindMove(undefined, { delta: 3, direction: 'finer' })).toBeUndefined()
    expect(applyGrindMove('66', undefined)).toBeUndefined()
    expect(applyGrindMove('not a number', { delta: 3, direction: 'finer' })).toBeUndefined()
  })
})

describe('setPending carries the grind target', () => {
  it('stores where the change goes, not just what to do', () => {
    const gear = setPending(emptyGear(NOW), 'grindTooFine', 'Grind 3 clicks coarser', NOW, {
      fromGrind: '66',
      targetGrind: '69',
      recipeId: 'v60-ultimate',
    })
    expect(gear.pendingHypothesis).toEqual({
      id: 'grindTooFine',
      action: 'Grind 3 clicks coarser',
      setAt: NOW,
      fromGrind: '66',
      targetGrind: '69',
      recipeId: 'v60-ultimate',
    })
  })

  it('still works for levers that are not grind', () => {
    const gear = setPending(emptyGear(NOW), 'tempTooLow', 'Raise by 2 °C', NOW)
    expect(gear.pendingHypothesis?.targetGrind).toBeUndefined()
    expect(gear.pendingHypothesis?.id).toBe('tempTooLow')
  })
})
