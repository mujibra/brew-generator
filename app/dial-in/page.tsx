'use client'

import { PageBody, PageHeader } from '@/app/components/ui'

import { compileRecipe } from '@/lib/brew/steps'
import { formatElapsed } from '@/lib/brew/timer'
import { repository } from '@/lib/db/dexie'
import type { BrewRecord, SettingsRecord } from '@/lib/db/repository'
import { type Attempt, diagnose } from '@/lib/dialin/engine'
import type { Drawdown, Symptom } from '@/lib/dialin/rules'
import {
  applyGrindMove,
  attemptsFromBrews,
  drawdownFromBrew,
  emptyGear,
  grinderOf,
  lastGrindSetting,
  mostRecentBrew,
  setPending,
  symptomFromBrew,
} from '@/lib/gear/store'
import { cardById } from '@/lib/learn/cards'
import { RECIPES, brewHref, recipeById, toRecipeInput } from '@/lib/recipes/builtin'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
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

function DialIn() {
  const params = useSearchParams()
  const targetId = params.get('brew')
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

  // The journal can name a specific brew; otherwise diagnose the latest.
  const subject = useMemo(
    () => (targetId ? brews.find((b) => b.id === targetId) : undefined) ?? mostRecentBrew(brews),
    [brews, targetId],
  )
  const targeted = Boolean(targetId && subject?.id === targetId)

  // Move from the setting actually used, not from a static baseline.
  const fromGrind = useMemo(
    () => subject?.grindSetting ?? lastGrindSetting(brews, subject?.recipeId),
    [subject, brews],
  )
  const history: Attempt[] = useMemo(() => attemptsFromBrews(brews) as Attempt[], [brews])

  // Seed the drawdown answer from the last brew, so the user is not retyping
  // something the log already knows.
  const inferredDrawdown = useMemo(() => {
    if (!subject?.recipeId) return undefined
    const recipe = recipeById(subject.recipeId)
    if (!recipe) return undefined
    const expected = compileRecipe(toRecipeInput(recipe)).totalS
    return drawdownFromBrew(subject, expected)
  }, [subject])

  useEffect(() => {
    if (inferredDrawdown) setDrawdown(inferredDrawdown)
  }, [inferredDrawdown])

  // The tags on the brew already say what was wrong with it.
  const inferredSymptom = useMemo(() => symptomFromBrew(subject), [subject])
  useEffect(() => {
    if (inferredSymptom) setSymptom(inferredSymptom as Symptom)
  }, [inferredSymptom])
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
    const targetGrind = applyGrindMove(fromGrind, result.value.grindUnits)
    const next = setPending(gear, result.value.hypothesis.id, result.value.action, Date.now(), {
      ...(fromGrind ? { fromGrind } : {}),
      ...(targetGrind ? { targetGrind } : {}),
      ...(subject?.recipeId ? { recipeId: subject.recipeId } : {}),
    })
    setGear(next)
    setCommitted(true)
    await repository().settings.put({ ...next, updatedAt: Date.now() })
  }

  return (
    <main>
      <PageHeader
        title="Dial in"
        lead={
          'One change at a time. Tell it what is wrong, brew again, then say whether it helped.'
        }
      />
      <PageBody>
        {subject && (
          <section className="rounded-lg bg-[var(--color-surface)] p-4">
            <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
              {targeted ? 'Diagnosing this brew' : 'Based on your last brew'}
            </p>
            <p className="mt-1 font-medium">
              {RECIPES.find((r) => r.id === subject.recipeId)?.name ??
                (subject.recipeId === 'generated' ? 'Built recipe' : 'Ad-hoc brew')}
            </p>
            <p className="mt-1 text-sm text-[var(--color-faint)] tabular-nums">
              {new Date(subject.startedAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
              })}
              {` · ${subject.doseG}:${subject.waterG}`}
              {` · ${formatElapsed(subject.totalTimeS * 1000)}`}
              {subject.grindSetting && ` · grind ${subject.grindSetting}`}
              {subject.score !== undefined && ` · scored ${subject.score}`}
            </p>
            {(inferredSymptom || inferredDrawdown) && (
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Filled in from the log
                {inferredSymptom && ` — tagged ${inferredSymptom}`}
                {inferredDrawdown && `, drawdown ${inferredDrawdown}`}. Change anything below if it
                was not quite that.
              </p>
            )}
            {!targeted && (
              <Link href="/journal/" className="tap mt-2 inline-block text-sm underline">
                Pick a different brew from the journal
              </Link>
            )}
          </section>
        )}

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
                className={`rounded-lg px-4 py-3 text-left transition-all duration-200 ${
                  symptom === s.id
                    ? 'bg-[var(--color-accent)] text-[var(--color-on-accent)]'
                    : 'bg-[var(--color-surface)] hover:scale-[1.02] hover:bg-[var(--color-raised)]'
                }`}
              >
                <span className="block font-bold tracking-tight">{s.label}</span>
                <span
                  className={`block text-sm ${
                    symptom === s.id ? 'text-[var(--color-on-accent)]' : 'text-[var(--color-muted)]'
                  }`}
                >
                  {s.hint}
                </span>
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
                className={`rounded-full px-4 py-2 text-sm transition-all duration-200 ${
                  drawdown === d.id
                    ? 'bg-[var(--color-accent)] font-semibold text-[var(--color-on-accent)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-ink)]'
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
            className="tap flex items-baseline justify-between gap-3 rounded-lg bg-[var(--color-surface)] px-4 py-3"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {grinder ? grinder.name : 'Not set'}
              </span>
              <span className="block text-sm text-[var(--color-faint)]">
                {grinder
                  ? "Advice comes back in this grinder's own clicks"
                  : 'Set it and advice arrives in clicks instead of a vague direction'}
              </span>
            </span>
            <span className="shrink-0 text-sm text-[var(--color-muted)]">Gear →</span>
          </Link>
        </section>

        <section className="mt-10 rounded-lg bg-[var(--color-surface)] p-5">
          {result.ok ? (
            <>
              <p className="text-sm uppercase tracking-widest text-[var(--color-muted)]">
                Do this next
              </p>
              <p className="mt-2 text-xl font-medium">{result.value.action}</p>
              {(() => {
                const to = applyGrindMove(fromGrind, result.value.grindUnits)
                if (!to || !result.value.grindUnits) return null
                return (
                  <p className="mt-2 text-lg tabular-nums">
                    <span className="text-[var(--color-muted)]">{fromGrind}</span>
                    <span className="text-[var(--color-faint)]"> → </span>
                    <span className="font-semibold text-[var(--color-accent)]">{to}</span>
                    <span className="text-[var(--color-faint)]">
                      {' '}
                      {result.value.grindUnits.unitLabel}
                    </span>
                  </p>
                )
              })()}
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
                    className="tap mt-4 flex items-baseline justify-between gap-3 rounded-lg px-4 py-3 bg-[var(--color-surface)] transition-all duration-200 hover:scale-[1.02] hover:bg-[var(--color-raised)]"
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
                <div className="mt-5 rounded-lg bg-[var(--color-raised)] p-4">
                  <p className="text-sm font-medium text-[var(--color-accent)]">
                    Testing this on your next brew
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    When you log it, the app will ask whether it helped and remember the answer.
                    Three no-change results in a row and it moves on to a different explanation.
                  </p>
                  {gear?.pendingHypothesis?.targetGrind && (
                    <p className="mt-2 text-sm">
                      <span className="text-[var(--color-muted)]">Set your grinder to </span>
                      <span className="font-semibold tabular-nums text-[var(--color-accent)]">
                        {gear.pendingHypothesis.targetGrind}
                      </span>
                      <span className="text-[var(--color-muted)]"> before you start.</span>
                    </p>
                  )}
                  <Link
                    href={brewHref(subject?.recipeId)}
                    className="tap mt-3 inline-block rounded-lg bg-[var(--color-accent)] px-5 text-sm font-semibold leading-10 text-[var(--color-on-accent)]"
                  >
                    Brew it
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={commit}
                  className="mt-5 w-full rounded-lg bg-[var(--color-accent)] py-4 font-semibold text-[var(--color-on-accent)]"
                >
                  I'll try this
                </button>
              )}

              {history.length > 0 && (
                <p className="mt-4 text-sm text-[var(--color-muted)]">
                  {history.length} previous attempt{history.length === 1 ? '' : 's'} on record,
                  taken from your journal.
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
      </PageBody>
    </main>
  )
}

export default function DialInPage() {
  // useSearchParams needs a Suspense boundary to prerender under static export.
  return (
    <Suspense fallback={null}>
      <DialIn />
    </Suspense>
  )
}
