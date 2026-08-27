import { compileRecipe, targetMassAt } from '@/lib/brew/steps'
import { describe, expect, it } from 'vitest'
import { RECIPES, recipeById, toRecipeInput } from './builtin'

describe('built-in recipes', () => {
  it('all compile', () => {
    for (const r of RECIPES) {
      expect(() => compileRecipe(toRecipeInput(r))).not.toThrow()
    }
  })

  it('each declares its total water and reaches it', () => {
    for (const r of RECIPES) {
      const c = compileRecipe(toRecipeInput(r))
      expect(c.totalWaterG).toBe(r.waterG)
      expect(targetMassAt(c, c.totalS)).toBe(r.waterG)
    }
  })

  it('each has a sane ratio, temperature, and total time', () => {
    for (const r of RECIPES) {
      const ratio = r.waterG / r.doseG
      expect(ratio, r.id).toBeGreaterThanOrEqual(10)
      expect(ratio, r.id).toBeLessThanOrEqual(20)
      expect(r.waterTempC, r.id).toBeGreaterThanOrEqual(80)
      expect(r.waterTempC, r.id).toBeLessThanOrEqual(100)

      const c = compileRecipe(toRecipeInput(r))
      expect(c.totalS, r.id).toBeGreaterThan(60)
      expect(c.totalS, r.id).toBeLessThan(900)
    }
  })

  // PRD 5.1: every number has a reason, and the reason must be reachable.
  it('each explains what it is optimising for and why it is shaped that way', () => {
    for (const r of RECIPES) {
      expect(r.optimisingFor, r.id).toBeTruthy()
      expect(r.notes.length, r.id).toBeGreaterThanOrEqual(3)
      expect(r.grind, r.id).toBeTruthy()
    }
  })

  it('each ends by serving', () => {
    for (const r of RECIPES) {
      const c = compileRecipe(toRecipeInput(r))
      expect(c.steps.at(-1)?.kind, r.id).toBe('serve')
    }
  })

  it('has unique ids', () => {
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length)
  })

  it('looks up by id', () => {
    expect(recipeById('v60-ultimate')?.name).toBe('Ultimate V60')
    expect(recipeById('nope')).toBeUndefined()
  })
})
