import { compileRecipe, targetMassAt } from '@/lib/brew/steps'
import { describe, expect, it } from 'vitest'
import { RECIPES, brewHref, recipeById, toRecipeInput } from './builtin'

describe('built-in recipes', () => {
  it('all compile', () => {
    for (const r of RECIPES) {
      expect(() => compileRecipe(toRecipeInput(r))).not.toThrow()
    }
  })

  it('each declares its total water and reaches it', () => {
    for (const r of RECIPES) {
      const c = compileRecipe(toRecipeInput(r))
      // On an iced recipe the ice is already in the carafe, so the pour
      // schedule only covers the hot water.
      const poured = r.waterG - (r.iceG ?? 0)
      expect(c.totalWaterG, r.id).toBe(poured)
      expect(targetMassAt(c, c.totalS), r.id).toBe(poured)
    }
  })

  it('an iced recipe keeps its ice inside the declared total', () => {
    for (const r of RECIPES.filter((x) => x.iced)) {
      expect(r.iceG, r.id).toBeGreaterThan(0)
      expect(r.iceG!, r.id).toBeLessThan(r.waterG)
      // Roughly the standard 40 % split.
      expect(r.iceG! / r.waterG, r.id).toBeGreaterThan(0.3)
      expect(r.iceG! / r.waterG, r.id).toBeLessThan(0.5)
      expect(
        r.prep?.some((p) => /ice/i.test(p.instruction)),
        r.id,
      ).toBe(true)
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

describe('brewHref', () => {
  it('routes a built-in to its own page', () => {
    expect(brewHref('v60-ultimate')).toBe('/brew/v60-ultimate/')
    expect(brewHref('french-press-clean')).toBe('/brew/french-press-clean/')
  })

  // Only the built-ins get a static route; a generated recipe lives elsewhere.
  it('routes a generated recipe to the custom runner, not a 404', () => {
    expect(brewHref('generated')).toBe('/brew/custom/')
  })

  it('falls back to the index for an unknown or missing id', () => {
    expect(brewHref('a-recipe-that-was-deleted')).toBe('/brew/')
    expect(brewHref(undefined)).toBe('/brew/')
    expect(brewHref('')).toBe('/brew/')
  })

  // The guarantee that keeps this honest: every href it returns is a real route.
  it('only ever returns paths that exist', () => {
    const routes = new Set(['/brew/', '/brew/custom/', ...RECIPES.map((r) => `/brew/${r.id}/`)])
    for (const id of [...RECIPES.map((r) => r.id), 'generated', 'nonsense', undefined]) {
      expect(routes.has(brewHref(id)), String(id)).toBe(true)
    }
  })
})
