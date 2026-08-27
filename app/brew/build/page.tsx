import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RecipeBuilder } from './RecipeBuilder'

export const metadata: Metadata = {
  title: 'Build a recipe',
  description:
    'Generate a full manual brew recipe from your brewer, grinder, bean and what you want in the cup — pour count, grams, grind, and temperature, with the reason for every number.',
}

export default function BuildPage() {
  // useSearchParams needs a Suspense boundary to prerender under static export.
  return (
    <Suspense fallback={null}>
      <RecipeBuilder />
    </Suspense>
  )
}
