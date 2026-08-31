import { PageBody, PageHeader } from '@/app/components/ui'
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
    <main>
      <PageHeader
        title="Brew"
        lead={'Pick a recipe, or build one around your gear and your bean.'}
      />
      <PageBody>
        <Link
          href="/brew/build/"
          className="tap group block rounded-lg bg-[var(--color-accent)] px-4 py-4 text-[var(--color-on-accent)] transition-all duration-200 hover:scale-[1.02] hover:bg-[var(--color-accent-strong)]"
        >
          <span className="block text-xl font-extrabold tracking-tight">Build a recipe</span>
          <span className="mt-1 block text-sm font-medium leading-snug opacity-80">
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
                      className="tap block rounded-lg bg-[var(--color-surface)] px-4 py-3"
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
      </PageBody>
    </main>
  )
}
