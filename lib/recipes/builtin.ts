/**
 * Built-in recipes — PRD F2.1.
 *
 * Bundled at build time so they work with no network and no account. Every
 * recipe carries attribution, what it is optimising for, and the reasoning
 * behind its shape, because PRD 5.1 says no number appears without a reason.
 *
 * Parameters only. Third-party recipes are credited and linked, never quoted
 * (PRD 11).
 */

import type { RecipeInput, StepSpec } from '@/lib/brew/steps'

export type MethodId = 'v60' | 'aeropress' | 'frenchPress' | 'switch' | 'chemex'

export type Intent = 'clarity' | 'body' | 'sweetness' | 'forgiveness' | 'balance'

export type BuiltinRecipe = RecipeInput & {
  id: string
  name: string
  methodId: MethodId
  methodName: string
  waterG: number
  waterTempC: number
  grind: string
  intent: Intent
  /** What the recipe is for, in one line the user can act on. */
  optimisingFor: string
  attribution?: string
  sourceUrl?: string
  geometry: 'cone' | 'flatBottom' | 'immersion'
  notes: string[]
}

const rinseAndPreheat = {
  kind: 'rinse' as const,
  label: 'Rinse the filter',
  instruction:
    'Rinse with hot water to wash out paper taste and preheat the brewer. Tip the water out.',
}

const dose = (g: number, grind: string) => ({
  kind: 'dose' as const,
  label: `Dose ${g} g`,
  instruction: `Grind ${g} g at ${grind}. Level the bed and zero your scale.`,
})

export const RECIPES: BuiltinRecipe[] = [
  {
    id: 'v60-ultimate',
    name: 'Ultimate V60',
    methodId: 'v60',
    methodName: 'Hario V60',
    doseG: 30,
    waterG: 500,
    waterTempC: 95,
    grind: 'medium-fine',
    intent: 'balance',
    optimisingFor: 'Sweetness and clarity together, with enough margin to be repeatable.',
    attribution: 'After James Hoffmann',
    sourceUrl: 'https://www.youtube.com/watch?v=AI4ynXzkSQo',
    geometry: 'cone',
    notes: [
      'The bloom is 2x the dose — enough to wet every ground without drowning the bed.',
      'Two large pours rather than many small ones: fewer chances to disturb the bed.',
      'The late swirl levels the bed so the drawdown is even instead of channelled.',
    ],
    prep: [rinseAndPreheat, dose(30, 'medium-fine')],
    steps: [
      {
        kind: 'bloom',
        toG: 60,
        durationS: 45,
        instruction: 'Pour to 60 g, then swirl to wet every ground.',
      },
      { kind: 'pour', toG: 300, pourS: 30, instruction: 'Pour in slow circles to 300 g.' },
      { kind: 'wait', durationS: 15, instruction: 'Let the level drop a little.' },
      {
        kind: 'pour',
        toG: 500,
        pourS: 30,
        instruction: 'Pour gently to 500 g, keeping the bed covered.',
      },
      {
        kind: 'agitate',
        style: 'swirl',
        durationS: 10,
        instruction: 'Swirl gently until the bed sits flat.',
      },
      { kind: 'drain', expectedS: 80 },
      { kind: 'serve', instruction: 'Swirl the carafe and serve. Total should land near 3:30.' },
    ],
  },
  {
    id: 'v60-46-balance',
    name: '4:6 Method (balanced)',
    methodId: 'v60',
    methodName: 'Hario V60',
    doseG: 20,
    waterG: 300,
    waterTempC: 93,
    grind: 'medium-coarse',
    intent: 'sweetness',
    optimisingFor: 'Independent control of sweetness and strength via two separable water blocks.',
    attribution: 'After Tetsu Kasuya',
    geometry: 'cone',
    notes: [
      'The first 40 % (two pours) sets acidity versus sweetness: a smaller first pour is sweeter.',
      'The last 60 % (three pours) sets strength: more pours means stronger.',
      'Coarser than a typical V60 because five pours add a lot of agitation.',
    ],
    prep: [rinseAndPreheat, dose(20, 'medium-coarse')],
    steps: [
      {
        kind: 'bloom',
        toG: 60,
        durationS: 45,
        instruction: 'Pour to 60 g. This is the first of the 40 %.',
      },
      { kind: 'pour', toG: 120, pourS: 10, instruction: 'Pour to 120 g. The 40 % is done.' },
      { kind: 'wait', durationS: 35 },
      { kind: 'pour', toG: 180, pourS: 10, instruction: 'Pour to 180 g.' },
      { kind: 'wait', durationS: 35 },
      { kind: 'pour', toG: 240, pourS: 10, instruction: 'Pour to 240 g.' },
      { kind: 'wait', durationS: 35 },
      { kind: 'pour', toG: 300, pourS: 10, instruction: 'Pour to 300 g.' },
      { kind: 'drain', expectedS: 50 },
      { kind: 'serve', instruction: 'Aim to finish around 3:30.' },
    ],
  },
  {
    id: 'aeropress-standard',
    name: 'AeroPress, upright',
    methodId: 'aeropress',
    methodName: 'AeroPress',
    doseG: 15,
    waterG: 250,
    waterTempC: 90,
    grind: 'medium-fine',
    intent: 'forgiveness',
    optimisingFor: 'A good cup with almost no technique. The most forgiving brewer there is.',
    geometry: 'immersion',
    notes: [
      'Immersion means the grind and time matter far less than in a pourover.',
      'Cooler water than a V60 because the full immersion extracts more efficiently.',
      'Press slowly: forcing it pushes fines through the paper and adds bitterness.',
    ],
    prep: [
      {
        kind: 'prepare',
        label: 'Assemble',
        instruction:
          'Paper filter in the cap, rinse it, screw the cap on, stand the chamber on your mug.',
      },
      dose(15, 'medium-fine'),
    ],
    steps: [
      { kind: 'pour', toG: 250, pourS: 20, instruction: 'Pour to 250 g, wetting all the grounds.' },
      { kind: 'agitate', style: 'stir', durationS: 10, instruction: 'Stir three times, gently.' },
      {
        kind: 'wait',
        durationS: 90,
        instruction: 'Steep. Put the plunger in to stop it dripping.',
      },
      { kind: 'press', durationS: 30, instruction: 'Press slowly and steadily. Stop at the hiss.' },
      { kind: 'serve', instruction: 'Serve. Add hot water to taste if it is too strong.' },
    ],
  },
  {
    id: 'french-press-clean',
    name: 'French press, no plunge',
    methodId: 'frenchPress',
    methodName: 'French press',
    doseG: 30,
    waterG: 500,
    waterTempC: 95,
    grind: 'coarse',
    intent: 'body',
    optimisingFor:
      'Full body with none of the usual silt. The plunger is a strainer, not a piston.',
    attribution: 'After James Hoffmann',
    geometry: 'immersion',
    notes: [
      'Skimming the crust removes most of the grounds that would otherwise end up in the cup.',
      'The long rest lets fines settle instead of being driven into the coffee by the plunge.',
      'Decant everything: coffee left on the grounds keeps extracting and turns bitter.',
    ],
    prep: [
      { kind: 'prepare', label: 'Preheat', instruction: 'Rinse the press with hot water.' },
      dose(30, 'coarse'),
    ],
    steps: [
      { kind: 'pour', toG: 500, pourS: 30, instruction: 'Pour to 500 g. Do not stir.' },
      { kind: 'wait', durationS: 240, instruction: 'Steep 4 minutes. Leave it completely alone.' },
      {
        kind: 'agitate',
        style: 'stir',
        durationS: 20,
        instruction: 'Break the crust and skim the foam and floating grounds off the top.',
      },
      { kind: 'wait', durationS: 300, instruction: 'Rest 5 more minutes so the fines sink.' },
      {
        kind: 'press',
        durationS: 15,
        instruction: 'Lower the plunger just to the surface. Do not push it down.',
      },
      { kind: 'serve', instruction: 'Pour off gently, leaving the last centimetre behind.' },
    ],
  },
  {
    id: 'switch-hybrid',
    name: 'Switch hybrid',
    methodId: 'switch',
    methodName: 'Hario Switch',
    doseG: 20,
    waterG: 320,
    waterTempC: 94,
    grind: 'medium',
    intent: 'sweetness',
    optimisingFor: 'Immersion sweetness and body, then a percolation finish for clarity.',
    geometry: 'cone',
    notes: [
      'Closed switch is immersion: even extraction, no channelling possible.',
      'Opening at the end drains through the bed, which cleans the cup up.',
      'If it stalls when open, the grind is too fine — not the switch failing.',
    ],
    prep: [
      rinseAndPreheat,
      { kind: 'prepare', label: 'Close the switch', instruction: 'Push the switch closed.' },
      dose(20, 'medium'),
    ],
    steps: [
      {
        kind: 'bloom',
        toG: 60,
        durationS: 45,
        instruction: 'Pour to 60 g and swirl. Switch stays closed.',
      },
      {
        kind: 'pour',
        toG: 320,
        pourS: 30,
        instruction: 'Pour to 320 g. Still closed — it will pool.',
      },
      { kind: 'wait', durationS: 75, instruction: 'Full immersion. Leave it.' },
      {
        kind: 'flip',
        durationS: 5,
        instruction: 'Open the switch to start the drawdown.',
      },
      { kind: 'drain', expectedS: 55 },
      { kind: 'serve', instruction: 'Aim to finish near 3:30.' },
    ],
  },
]

/**
 * The route that actually brews a given recipe id.
 *
 * Only the built-ins get their own static route. A generated recipe lives at
 * /brew/custom/, and an unknown id — a recipe that was removed, or an ad-hoc
 * brew — has no page at all, so it falls back to the index rather than 404ing.
 */
export function brewHref(recipeId: string | undefined): string {
  if (!recipeId) return '/brew/'
  if (recipeId === 'generated') return '/brew/custom/'
  return RECIPES.some((r) => r.id === recipeId) ? `/brew/${recipeId}/` : '/brew/'
}

export function recipeById(id: string): BuiltinRecipe | undefined {
  return RECIPES.find((r) => r.id === id)
}

export function recipesByMethod(): Map<string, BuiltinRecipe[]> {
  const out = new Map<string, BuiltinRecipe[]>()
  for (const r of RECIPES) {
    const list = out.get(r.methodName) ?? []
    list.push(r)
    out.set(r.methodName, list)
  }
  return out
}

/** Steps as the compiler wants them, without the presentation metadata. */
export function toRecipeInput(r: BuiltinRecipe): RecipeInput {
  const steps: StepSpec[] = r.steps
  return { doseG: r.doseG, prep: r.prep, steps }
}
