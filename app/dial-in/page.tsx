'use client'

import { compileRecipe } from '@/lib/brew/steps'
import { repository } from '@/lib/db/dexie'
import type { BrewRecord, SettingsRecord } from '@/lib/db/repository'
import { type Attempt, diagnose } from '@/lib/dialin/engine'
import type { Drawdown, Symptom } from '@/lib/dialin/rules'
import {
  attemptsFromBrews,
  drawdownFromBrew,
  emptyGear,
  grinderOf,
  mostRecentBrew,
  setPending,
} from '@/lib/gear/store'
import { cardById } from '@/lib/learn/cards'
import { recipeById, toRecipeInput } from '@/lib/recipes/builtin'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

const SYMPTOMS: { id: Symptom; label: string; hint: string }[] = [
  { id: 'sour', label: 'Sour or sharp', hint: 'Aggressive, lemony, makes you wince' },
  { id: 'bitter', label: 'Bitter or harsh', hint: 'Burnt, aspirin-like' },
  { id: 'thin', label: 'Thin or watery', hint: 'Not sour, just weak' },
  { id: 'muddy', label: 'Muddy or heavy', hint: 'Unclear, silty' },
  { id: 'astringent', label: 'Drying or astringent', hint: 'Mouth-puckering finish' },
  { id: 'flat', label: 'Flat or dull', hint: 'Nothing wrong, nothing there' },
  { id: 'harshWhenCool', label: 'Fine hot, harsh cold', hint: 'Falls apart as it cools' },
]

const DRAWDOWNS: { id: Drawdown | 'unknown'; label: string }[] = [
  { id: 'unknown', label: "Didn't notice" },
  { id: 'fast', label: 'Faster than expected' },
  { id: 'normal', label: 'About right' },
  { id: 'slow', label: 'Slower than expected' },
  { id: 'stalled', label: 'Stalled' },
]

export default function DialInPage() {
  const [symptom, setSymptom] = useState<Symptom>('sour')
  const [drawdown, setDrawdown] = useState<Drawdown | 'unknown'>('unknown')
  const [expert, setExpert] = useState(false)
  const [gear, setGear] = useState<SettingsRecord | null>(null)
  const [brews, setBrews] = useState<BrewRecord[]>([])
  const [committed, setCommitted] = useState(false)

  // The journal is the memory: attempt history and the last brew's drawdown both
  // come from it, so the confirm loop survives closing the app (PRD F4 R3, R4).
  useEffect(() => {
    const repo = repository()
    Promise.all([repo.settings.get('gear'), repo.brews.all()])
      .then(([g, b]) => {
        setGear(g ?? emptyGear(Date.now()))
        setBrews(b)
      })
      .catch(() => setGear(emptyGear(Date.now())))
  }, [])

  const last = useMemo(() => mostRecentBrew(brews), [brews])
  const history: Attempt[] = useMemo(() => attemptsFromBrews(brews) as Attempt[], [brews])

  // Seed the drawdown answer from the last brew, so the user is not retyping
  // something the log already knows.
  const inferredDrawdown = useMemo(() => {
    if (!last?.recipeId) return undefined
    const recipe = recipeById(last.recipeId)
    if (!recipe) return undefined
    const expected = compileRecipe(toRecipeInput(recipe)).totalS
    return drawdownFromBrew(last, expected)
  }, [last])

  useEffect(() => {
    if (inferredDrawdown) setDrawdown(inferredDrawdown)
  }, [inferredDrawdown])
  const grinder = grinderOf(gear ?? undefined)

  const result = useMemo(() => {
    try {
      return {
        ok: true as const,
        value: diagnose({
          evidence: { symptom, ...(drawdown === 'unknown' ? {} : { drawdown }) },
          // With no grinder set, stay in relative terms — the honest default
          // (PRD F6 R3). Baseline is per-brewer, taken from the last brew's.
          grinder:
            grinder && grinder.micronsPerUnit > 0
              ? {
                  name: grinder.name,
                  unitLabel: grinder.unitLabel,
                  micronsPerUnit: grinder.micronsPerUnit,
                }
              : { name: 'grinder', unitLabel: 'clicks' },
          history,
        }),
      }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
  }, [symptom, drawdown, history, grinder])

  /**
   * Commit to trying this change. The verdict is not asked here — it is asked
   * when the next brew is logged, which is the only moment the user actually
   * knows (PRD F4 R3).
   */
  async function commit() {
    if (!result.ok || !gear) return
    const next = setPending(gear, result.value.hypothesis.id, result.value.action, Date.now())
    setGear(next)
    setCommitted(true)
    await repository().settings.put({ ...next, updatedAt: Date.now() })
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="text-sm text-[var(--color-muted)]">
        ← Extraction
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Dial in</h1>
      <p className="mt-2 text-[var(--color-muted)]">
        One change at a time. Tell it what is wrong, brew again, then say whether it helped.
      </p>

      <fieldset className="mt-8">
        <legend className="mb-3 text-sm font-medium uppercase tracking-widest text-[var(--color-muted)]">
          What is wrong?
        </legend>
        <div className="grid gap-2">
          {SYMPTOMS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSymptom(s.id)}
              className={`rounded-xl border px-4 py-3 text-left ${
                symptom === s.id
                  ? 'border-[var(--color-accent)] bg-[var(--color-surface)]'
                  : 'border-[var(--color-line)]'
              }`}
            >
              <span className="block font-medium">{s.label}</span>
              <span className="block text-sm text-[var(--color-muted)]">{s.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-8">
        <legend className="mb-3 text-sm font-medium uppercase tracking-widest text-[var(--color-muted)]">
          How was the drawdown?
        </legend>
        <div className="flex flex-wrap gap-2">
          {DRAWDOWNS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDrawdown(d.id)}
              className={`rounded-full border px-4 py-2 text-sm ${
                drawdown === d.id
                  ? 'border-[var(--color-accent)] bg-[var(--color-surface)]'
                  : 'border-[var(--color-line)]'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          This is the question that separates a coarse grind from a channelling bed. Both taste
          sour. The fixes are opposites.
        </p>
      </fieldset>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-[var(--color-muted)]">
          Your grinder
        </h2>
        <Link
          href="/gear/"
          className="tap flex items-baseline justify-between gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3"
        >
          <span className="min-w-0">
            <span className="block truncate font-medium">{grinder ? grinder.name : 'Not set'}</span>
            <span className="block text-sm text-[var(--color-faint)]">
              {grinder
                ? "Advice comes back in this grinder's own clicks"
                : 'Set it and advice arrives in clicks instead of a vague direction'}
            </span>
          </span>
          <span className="shrink-0 text-sm text-[var(--color-muted)]">Gear →</span>
        </Link>
      </section>

      <section className="mt-10 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
        {result.ok ? (
          <>
            <p className="text-sm uppercase tracking-widest text-[var(--color-muted)]">
              Do this next
            </p>
            <p className="mt-2 text-xl font-medium">{result.value.action}</p>
            <p className="mt-4 text-sm text-[var(--color-muted)]">
              <span className="text-[var(--color-ink)]">Expect: </span>
              {result.value.prediction}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Because: {result.value.reasoning[0]}
            </p>
            <p className="mt-4 text-sm">
              <span className="text-[var(--color-muted)]">Confidence: </span>
              {result.value.confidence} · {result.value.hypothesis.label}
            </p>

            {/* PRD F4 R6: never a recommendation without its mechanism. */}
            {(() => {
              const card = cardById(result.value.mechanismCardId)
              if (!card) return null
              return (
                <Link
                  href={`/learn/${card.id}/`}
                  className="tap mt-4 flex items-baseline justify-between gap-3 rounded-xl border border-[var(--color-line)] px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block text-xs uppercase tracking-widest text-[var(--color-muted)]">
                      Why this works
                    </span>
                    <span className="mt-1 block truncate font-medium">{card.name}</span>
                  </span>
                  <span className="shrink-0 text-sm text-[var(--color-muted)]">Read →</span>
                </Link>
              )
            })()}

            {gear?.pendingHypothesis?.id === result.value.hypothesis.id || committed ? (
              <div className="mt-5 rounded-xl bg-[var(--color-raised)] p-4">
                <p className="text-sm font-medium text-[var(--color-accent)]">
                  Testing this on your next brew
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  When you log it, the app will ask whether it helped and remember the answer. Three
                  no-change results in a row and it moves on to a different explanation.
                </p>
                <Link
                  href="/brew/"
                  className="tap mt-3 inline-block rounded-xl bg-[var(--color-accent)] px-5 text-sm font-semibold leading-10 text-[var(--color-on-accent)]"
                >
                  Brew it
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={commit}
                className="mt-5 w-full rounded-2xl bg-[var(--color-accent)] py-4 font-semibold text-[var(--color-on-accent)]"
              >
                I'll try this
              </button>
            )}

            {history.length > 0 && (
              <p className="mt-4 text-sm text-[var(--color-muted)]">
                {history.length} previous attempt{history.length === 1 ? '' : 's'} on record, taken
                from your journal.
              </p>
            )}

            <button
              type="button"
              onClick={() => setExpert((v) => !v)}
              className="mt-5 text-sm underline text-[var(--color-muted)]"
            >
              {expert ? 'Hide' : 'Show'} the full ranking
            </button>

            {expert && (
              <ul className="mt-3 space-y-2 text-sm">
                {result.value.ranking.map((r) => (
                  <li key={r.hypothesis.id} className="flex gap-3">
                    <span className="w-8 tabular-nums text-[var(--color-muted)]">{r.score}</span>
                    <span className={r.excluded ? 'line-through opacity-60' : ''}>
                      {r.hypothesis.label}
                      {r.excluded === 'exhausted' && ' — tried, no change'}
                      {r.excluded === 'madeItWorse' && ' — made it worse'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="text-[var(--color-warn)]">{result.error}</p>
        )}
      </section>
    </main>
  )
}
