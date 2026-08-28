'use client'

import { loadSession, persistSession, useNow, useStepCue, useWakeLock } from '@/lib/brew/hooks'
import {
  type Session,
  advancePrep,
  beginBrew,
  chooseBean,
  finishBrew,
  newSession,
  pauseBrew,
  pourStatus,
  prepComplete,
  resumeBrew,
  rewindStep,
  viewOf,
} from '@/lib/brew/session'
import { compileRecipe } from '@/lib/brew/steps'
import { formatElapsed } from '@/lib/brew/timer'
import { repository } from '@/lib/db/dexie'
import type { BeanRecord, BrewRecord, SettingsRecord } from '@/lib/db/repository'
import { emptyGear, grinderOf, lastGrindSetting } from '@/lib/gear/store'
import { type BuiltinRecipe, toRecipeInput } from '@/lib/recipes/builtin'
import { summariseShelf } from '@/lib/shelf/bean'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BeanChoice } from './BeanChoice'
import { LogSheet } from './LogSheet'

export function BrewRunner({ recipe }: { recipe: BuiltinRecipe }) {
  const compiled = useMemo(() => compileRecipe(toRecipeInput(recipe)), [recipe])
  const [session, setSession] = useState<Session>(() => newSession(recipe.id))
  const [restorable, setRestorable] = useState<Session | null>(null)
  const [actualG, setActualG] = useState<string>('')
  const [beans, setBeans] = useState<BeanRecord[]>([])
  const [brews, setBrews] = useState<BrewRecord[]>([])
  const [gear, setGear] = useState<SettingsRecord | null>(null)

  // The shelf, for choosing a bag before the timer starts.
  useEffect(() => {
    const repo = repository()
    Promise.all([repo.beans.all(), repo.brews.all(), repo.settings.get('gear')])
      .then(([allBeans, allBrews, row]) => {
        const active = summariseShelf(allBeans, Date.now(), recipe.doseG).active
        setBeans(active)
        setBrews(allBrews)
        setGear(row ?? emptyGear(Date.now()))
        // One bag on the shelf is not a choice worth making.
        if (active.length === 1) setSession((s) => (s.timer ? s : chooseBean(s, active[0]!.id)))
      })
      .catch(() => setBeans([]))
  }, [recipe.doseG])

  // Offer to resume an interrupted brew rather than silently discarding it.
  useEffect(() => {
    const saved = loadSession(recipe.id)
    if (saved?.timer) setRestorable(saved)
  }, [recipe.id])

  const view = viewOf(session, compiled, useNow(session.timer !== null))
  const running = view.phase === 'brewing' && session.timer !== null

  useWakeLock(running)
  useStepCue(view.step?.index, running)

  useEffect(() => {
    persistSession(session.timer ? session : null)
  }, [session])

  const update = useCallback((fn: (s: Session, now: number) => Session) => {
    setSession((s) => fn(s, Date.now()))
  }, [])

  if (restorable) {
    return (
      <Restore
        onResume={() => {
          setSession(restorable)
          setRestorable(null)
        }}
        onDiscard={() => {
          persistSession(null)
          setRestorable(null)
        }}
      />
    )
  }

  if (view.phase === 'done') {
    return (
      <LogSheet
        recipe={recipe}
        session={session}
        actualWaterG={actualG === '' ? undefined : Number(actualG)}
        totalTimeS={view.elapsedS}
        initialBeanId={session.beanId}
        onDone={() => {
          persistSession(null)
          setSession(newSession(recipe.id))
          setActualG('')
        }}
      />
    )
  }

  // ---- Prep phase: untimed, user-advanced.
  if (view.phase === 'prep') {
    const step = view.prep
    return (
      <div className="flex min-h-dvh flex-col px-5 py-6">
        <Header recipe={recipe} />
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-sm uppercase tracking-widest text-[var(--color-muted)]">
            Step {session.prepIndex + 1} of {compiled.prep.length} · before the timer
          </p>
          <h2 className="mt-3 text-3xl font-semibold">{step?.label}</h2>
          <p className="mt-3 text-lg text-[var(--color-muted)]">{step?.instruction}</p>
        </div>
        <button
          type="button"
          onClick={() => setSession((s) => advancePrep(s, compiled.prep.length))}
          className="w-full rounded-2xl bg-[var(--color-accent)] py-5 text-xl font-semibold text-[var(--color-on-accent)]"
        >
          Next
        </button>
      </div>
    )
  }

  // ---- Ready to start: prep done, timer not yet running.
  if (session.timer === null && prepComplete(session, compiled.prep.length)) {
    return (
      <div className="flex min-h-dvh flex-col px-5 py-6">
        <Header recipe={recipe} />
        <div className="flex-1 py-8">
          <h2 className="text-3xl font-semibold">Ready</h2>
          <p className="mt-3 text-lg text-[var(--color-muted)]">
            {recipe.doseG} g coffee, {recipe.waterG} g water at {recipe.waterTempC} °C,{' '}
            {recipe.grind} grind.
          </p>
          <p className="mt-2 text-[var(--color-muted)]">
            First step: {compiled.steps[0]?.instruction}
          </p>

          {(() => {
            const pending = gear?.pendingHypothesis
            const grinder = grinderOf(gear ?? undefined)
            const units = grinder?.unitLabel ?? 'clicks'
            const target = pending?.targetGrind ?? lastGrindSetting(brews, recipe.id)
            if (!target) return null
            return (
              <div
                className={`mt-6 rounded-2xl border p-4 ${
                  pending?.targetGrind
                    ? 'border-[var(--color-accent)] bg-[var(--color-surface)]'
                    : 'border-[var(--color-line)] bg-[var(--color-surface)]'
                }`}
              >
                <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
                  {pending?.targetGrind ? 'Testing this change' : 'Your last setting'}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {pending?.fromGrind && (
                    <>
                      <span className="text-[var(--color-muted)]">{pending.fromGrind}</span>
                      <span className="text-[var(--color-faint)]"> → </span>
                    </>
                  )}
                  <span className="text-[var(--color-accent)]">{target}</span>
                  <span className="ml-1 text-base font-normal text-[var(--color-faint)]">
                    {units}
                  </span>
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {pending?.targetGrind
                    ? 'Set your grinder here before you start. The log will ask whether it helped.'
                    : 'Carried over from your last brew of this recipe.'}
                </p>
              </div>
            )
          })()}

          <div className="mt-6">
            <BeanChoice
              beans={beans}
              brews={brews}
              beanId={session.beanId}
              doseG={recipe.doseG}
              onChange={(id) => setSession((s) => chooseBean(s, id))}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => update(beginBrew)}
          className="w-full rounded-2xl bg-[var(--color-accent)] py-6 text-2xl font-semibold text-[var(--color-on-accent)]"
        >
          Start brewing
        </button>
      </div>
    )
  }

  // ---- Brewing.
  const actual = actualG === '' ? undefined : Number(actualG)
  const status = pourStatus(view, actual)
  const countdown = Math.max(0, Math.ceil(view.secondsToStepEnd))

  return (
    <div className="flex min-h-dvh flex-col px-5 py-6">
      <Header recipe={recipe} />

      {/* Elapsed + target mass: the two numbers that matter at arm's length. */}
      <div className="mt-2 flex items-baseline justify-between">
        <span className="font-mono text-5xl tabular-nums">
          {formatElapsed(view.elapsedS * 1000)}
        </span>
        <span className="text-right">
          <span className="block font-mono text-5xl tabular-nums text-[var(--color-accent)]">
            {Math.round(view.targetMassG)}
            <span className="text-2xl"> g</span>
          </span>
          {view.targetFlowGPerS > 0 && (
            <span className="block text-sm text-[var(--color-muted)]">
              {view.targetFlowGPerS.toFixed(1)} g/s
            </span>
          )}
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
        <div
          className="h-full bg-[var(--color-accent)] transition-[width] duration-100"
          style={{ width: `${view.brewProgress * 100}%` }}
        />
      </div>

      {/* Current instruction. */}
      <div className="flex flex-1 flex-col justify-center py-6">
        <p className="text-sm uppercase tracking-widest text-[var(--color-muted)]">
          {view.step?.label}
          {view.step && view.step.durationS > 0 && !view.step.userTerminated && (
            <span className="ml-2 tabular-nums">{countdown}s</span>
          )}
        </p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight">{view.step?.instruction}</h2>

        {view.step?.userTerminated && (
          <p className="mt-4 text-[var(--color-muted)]">
            Tap Next when the dripping stops — a clock cannot know when your bed has drained.
          </p>
        )}

        {view.nextStep && (
          <p className="mt-6 text-[var(--color-muted)]">
            Next: {view.nextStep.label}
            {view.nextStep.startS > 0 && (
              <span className="tabular-nums"> at {formatElapsed(view.nextStep.startS * 1000)}</span>
            )}
          </p>
        )}
      </div>

      {/* Optional manual scale entry, with ahead/behind feedback. */}
      <div className="mb-4">
        <label className="flex items-center gap-3">
          <span className="text-sm text-[var(--color-muted)]">On the scale</span>
          <input
            type="number"
            inputMode="decimal"
            value={actualG}
            onChange={(e) => setActualG(e.target.value)}
            placeholder="optional"
            className="w-28 rounded-xl border border-[var(--color-line)] bg-transparent px-3 text-lg tabular-nums"
          />
          {status !== 'notPouring' && (
            <span
              className={
                status === 'onTarget'
                  ? 'text-sm text-[var(--color-good-ink)]'
                  : 'text-sm text-[var(--color-warn)]'
              }
            >
              {status === 'onTarget'
                ? 'on target'
                : status === 'ahead'
                  ? `${Math.round((actual ?? 0) - view.targetMassG)} g ahead`
                  : `${Math.round(view.targetMassG - (actual ?? 0))} g behind`}
            </span>
          )}
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => update((s, now) => rewindStep(s, compiled, now))}
          className="rounded-2xl border border-[var(--color-line)] py-4 text-base"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => update(view.phase === 'paused' ? resumeBrew : pauseBrew)}
          className="rounded-2xl border border-[var(--color-line)] py-4 text-base"
        >
          {view.phase === 'paused' ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={() => update(finishBrew)}
          className="rounded-2xl bg-[var(--color-accent)] py-4 text-base font-semibold text-[var(--color-on-accent)]"
        >
          {view.isLastStep ? 'Finish' : 'Done'}
        </button>
      </div>
    </div>
  )
}

function Header({ recipe }: { recipe: BuiltinRecipe }) {
  return (
    <div className="flex items-baseline justify-between">
      <Link href="/brew/" className="text-sm text-[var(--color-muted)]">
        ← Recipes
      </Link>
      <span className="text-sm text-[var(--color-muted)]">
        {recipe.name} · {recipe.doseG}:{recipe.waterG}
      </span>
    </div>
  )
}

function Restore({ onResume, onDiscard }: { onResume: () => void; onDiscard: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col justify-center px-5 py-6">
      <h2 className="text-2xl font-semibold">You have a brew in progress</h2>
      <p className="mt-3 text-[var(--color-muted)]">
        The timer kept running from when you started it, so resuming picks up at the real elapsed
        time — not where the screen stopped updating.
      </p>
      <div className="mt-8 grid gap-3">
        <button
          type="button"
          onClick={onResume}
          className="rounded-2xl bg-[var(--color-accent)] py-5 text-lg font-semibold text-[var(--color-on-accent)]"
        >
          Resume
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-2xl border border-[var(--color-line)] py-5 text-lg"
        >
          Discard and start over
        </button>
      </div>
    </div>
  )
}
