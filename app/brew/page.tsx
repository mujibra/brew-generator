import { compileRecipe } from '@/lib/brew/steps'
import { formatElapsed } from '@/lib/brew/timer'
import { recipesByMethod, toRecipeInput } from '@/lib/recipes/builtin'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Recipes',
  description: 'Guided manual brew recipes for V60, AeroPress, French press, and Switch.',
}

export default function BrewIndex() {
  const byMethod = [...recipesByMethod().entries()]

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="text-sm text-[var(--color-muted)]">
        ← Extraction
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Brew</h1>
      <p className="mt-2 text-[var(--color-muted)]">
        Pick a recipe, or build one around your gear and your bean.
      </p>

      <Link
        href="/brew/build/"
        className="tap mt-6 block rounded-xl border border-[var(--color-accent)] bg-[var(--color-surface)] px-4 py-4"
      >
        <span className="block font-medium">Build a recipe</span>
        <span className="mt-1 block text-sm text-[var(--color-muted)]">
          Brewer, grinder, roast, altitude and what you want in the cup, in — pour count, grams,
          grind and temperature out, with the reason for every number.
        </span>
      </Link>

      {byMethod.map(([method, recipes]) => (
        <section key={method} className="mt-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-[var(--color-muted)]">
            {method}
          </h2>
          <ul className="space-y-2">
            {recipes.map((r) => {
              const compiled = compileRecipe(toRecipeInput(r))
              return (
                <li key={r.id}>
                  <Link
                    href={`/brew/${r.id}/`}
                    className="tap block rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-sm tabular-nums text-[var(--color-muted)]">
                        {r.doseG}:{r.waterG} · {formatElapsed(compiled.totalS * 1000)}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-[var(--color-muted)]">
                      {r.optimisingFor}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--color-muted)]">
                      {r.grind} · {r.waterTempC} °C
                      {r.attribution ? ` · ${r.attribution}` : ''}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </main>
  )
}
