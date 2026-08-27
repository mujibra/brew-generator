import { RECIPES, recipeById } from '@/lib/recipes/builtin'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BrewRunner } from '../BrewRunner'

/** Static export needs every route enumerated at build time. */
export function generateStaticParams() {
  return RECIPES.map((r) => ({ recipeId: r.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ recipeId: string }>
}): Promise<Metadata> {
  const { recipeId } = await params
  const recipe = recipeById(recipeId)
  if (!recipe) return { title: 'Recipe not found' }
  return {
    title: recipe.name,
    description: `${recipe.methodName}: ${recipe.doseG} g to ${recipe.waterG} g at ${recipe.waterTempC} °C. ${recipe.optimisingFor}`,
  }
}

export default async function BrewPage({ params }: { params: Promise<{ recipeId: string }> }) {
  const { recipeId } = await params
  const recipe = recipeById(recipeId)
  if (!recipe) notFound()
  return <BrewRunner recipe={recipe} />
}
