'use client'

import type { BuiltinRecipe } from '@/lib/recipes/builtin'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BrewRunner } from '../BrewRunner'

/**
 * Runs a generated recipe. It lives in localStorage rather than the URL because
 * a static export cannot mint a route per generated recipe (PRD 18.4).
 */
export default function CustomBrewPage() {
  const [recipe, setRecipe] = useState<BuiltinRecipe | null | 'missing'>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('extraction:generated')
      setRecipe(raw ? (JSON.parse(raw) as BuiltinRecipe) : 'missing')
    } catch {
      setRecipe('missing')
    }
  }, [])

  if (recipe === null) return null

  if (recipe === 'missing') {
    return (
      <main className="flex min-h-dvh flex-col justify-center px-5 py-6">
        <h1 className="text-2xl font-semibold">No generated recipe</h1>
        <p className="mt-3 text-[var(--color-muted)]">
          Build one and it will appear here, ready to run.
        </p>
        <Link
          href="/brew/build/"
          className="tap mt-8 rounded-lg bg-[var(--color-accent)] py-5 text-center text-lg font-semibold text-[var(--color-on-accent)]"
        >
          Build a recipe
        </Link>
      </main>
    )
  }

  return <BrewRunner recipe={recipe} />
}
