'use client'

import { Select } from '@/app/components/Select'
import type { Session } from '@/lib/brew/session'
import { formatElapsed } from '@/lib/brew/timer'
import {
  beverageMass,
  controlChartZone,
  extractionYield,
  ratio as ratioOf,
} from '@/lib/calc/extraction'
import { repository } from '@/lib/db/dexie'
import type { BeanRecord } from '@/lib/db/repository'
import type { SettingsRecord } from '@/lib/db/repository'
import { clearPending, emptyGear } from '@/lib/gear/store'
import type { BuiltinRecipe } from '@/lib/recipes/builtin'
import { beanAge, brewsLeft, consumeDose, summariseShelf } from '@/lib/shelf/bean'
import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * Post-brew capture — PRD F3.1.
 *
 * Everything is optional except the score, and every field the app already knows
 * is pre-filled. If TDS is entered, EY is computed and the control-chart zone is
 * shown immediately, because a number with no interpretation teaches nothing.
 */

const TAGS = ['sour', 'bitter', 'thin', 'muddy', 'sweet', 'clean', 'balanced', 'astringent', 'flat']

export function LogSheet({
  recipe,
  session,
  actualWaterG,
  totalTimeS,
  onDone,
  initialBeanId,
}: {
  recipe: BuiltinRecipe
  session: Session
  actualWaterG?: number
  totalTimeS: number
  onDone: () => void
  /** Chosen before the brew started, so it is not asked for twice. */
  initialBeanId?: string
}) {
  const [score, setScore] = useState(6)
  const [tags, setTags] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [tds, setTds] = useState('')
  const [beverageG, setBeverageG] = useState('')
  const [saved, setSaved] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')
  const [beans, setBeans] = useState<BeanRecord[]>([])
  const [beanId, setBeanId] = useState<string>(initialBeanId ?? '')
  const [gear, setGear] = useState<SettingsRecord | null>(null)
  const [verdict, setVerdict] = useState<'better' | 'worse' | 'same' | null>(null)

  // If the user committed to a dial-in change, this is the moment they can
  // actually judge it (PRD F4 R3).
  useEffect(() => {
    repository()
      .settings.get('gear')
      .then((row) => setGear(row ?? emptyGear(Date.now())))
      .catch(() => setGear(null))
  }, [])

  // Which bag was this? Attaching it is what turns the journal into per-bag
  // history and lets the shelf decrement itself (PRD F5 R4).
  useEffect(() => {
    repository()
      .beans.all()
      .then((all) => {
        const active = summariseShelf(all, Date.now(), recipe.doseG).active
        setBeans(active)
        // One bag on the shelf is not a choice worth making.
        if (!initialBeanId && active.length === 1) setBeanId(active[0]!.id)
      })
      .catch(() => setBeans([]))
  }, [recipe.doseG, initialBeanId])

  const waterG = actualWaterG ?? recipe.waterG
  const tdsPct = tds === '' ? undefined : Number(tds)

  const ey = (() => {
    if (tdsPct === undefined || !Number.isFinite(tdsPct) || tdsPct <= 0) return undefined
    try {
      const bev = beverageMass({
        ...(beverageG === '' ? {} : { measuredG: Number(beverageG) }),
        totalWaterG: waterG,
        doseG: recipe.doseG,
        method: recipe.geometry === 'immersion' ? 'immersionDecanted' : 'paperCone',
      })
      const r = extractionYield({ tdsPct, doseG: recipe.doseG, beverage: bev })
      return { ...r, zone: controlChartZone(r.eyPct, tdsPct) }
    } catch {
      return undefined
    }
  })()

  async function save() {
    setSaved('saving')
    try {
      const now = Date.now()
      const bean = beans.find((b) => b.id === beanId)
      const age = bean ? beanAge(bean, now) : undefined

      await repository().brews.put({
        id: crypto.randomUUID(),
        updatedAt: now,
        startedAt: session.startedAtEpoch ?? now,
        recipeId: recipe.id,
        ...(bean ? { beanId: bean.id } : {}),
        ...(age !== undefined ? { daysOffRoast: age } : {}),
        doseG: recipe.doseG,
        waterG,
        totalTimeS: Math.round(totalTimeS),
        waterTempC: recipe.waterTempC,
        ...(beverageG === '' ? {} : { beverageG: Number(beverageG) }),
        ...(tdsPct === undefined ? {} : { tdsPct }),
        ...(ey === undefined ? {} : { eyPct: ey.eyPct }),
        score,
        tags,
        notes,
        // The verdict on the change being tested, attached to the brew that
        // tested it. The journal becomes the dial-in engine's memory.
        ...(gear?.pendingHypothesis && verdict
          ? { dialInHypothesis: gear.pendingHypothesis.id, dialInOutcome: verdict }
          : {}),
      })

      if (gear?.pendingHypothesis && verdict) {
        await repository().settings.put({ ...clearPending(gear), updatedAt: now })
      }
      // Decrement the bag. Clamped at zero, never negative (PRD F5.3).
      if (bean) {
        const { bean: next } = consumeDose(bean, recipe.doseG)
        await repository().beans.put({ ...next, updatedAt: now })
      }

      await repository().requestPersistence()
      setSaved('ok')
    } catch (e) {
      setError((e as Error).message)
      setSaved('error')
    }
  }

  if (saved === 'ok') {
    return (
      <div className="flex min-h-dvh flex-col justify-center px-5 py-6">
        <h2 className="text-3xl font-semibold">Logged</h2>
        <p className="mt-3 text-[var(--color-muted)]">
          {formatElapsed(totalTimeS * 1000)} · {recipe.doseG} g / {waterG} g · 1:
          {ratioOf.fromDoseWater(recipe.doseG, waterG).toFixed(1)} · scored {score}/10
        </p>
        <div className="mt-8 grid gap-3">
          <Link
            href="/dial-in/"
            className="tap rounded-2xl bg-[var(--color-accent)] py-5 text-center text-lg font-semibold text-[var(--color-on-accent)]"
          >
            Something was off — dial it in
          </Link>
          <button
            type="button"
            onClick={onDone}
            className="rounded-2xl border border-[var(--color-line)] py-5 text-lg"
          >
            Brew this again
          </button>
          <Link href="/" className="tap py-4 text-center text-[var(--color-muted)]">
            Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh px-5 py-6">
      <h2 className="text-2xl font-semibold">How was it?</h2>
      <p className="mt-2 text-[var(--color-muted)]">
        {formatElapsed(totalTimeS * 1000)} · {recipe.doseG} g / {waterG} g · 1:
        {ratioOf.fromDoseWater(recipe.doseG, waterG).toFixed(1)} · {recipe.waterTempC} °C
      </p>

      {gear?.pendingHypothesis && (
        <div className="mt-8 rounded-2xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-4">
          <p className="text-sm uppercase tracking-widest text-[var(--color-muted)]">
            You were testing
          </p>
          <p className="mt-1 font-medium">{gear.pendingHypothesis.action}</p>
          <p className="mt-3 text-sm text-[var(--color-muted)]">Did it help?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ['better', 'Better'],
                ['same', 'No change'],
                ['worse', 'Worse'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setVerdict(verdict === id ? null : id)}
                className={`compact rounded-full border px-4 text-sm ${
                  verdict === id
                    ? 'border-[var(--color-accent)] bg-[var(--color-raised)]'
                    : 'border-[var(--color-line)] text-[var(--color-muted)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {verdict === 'same' && (
            <p className="mt-3 text-sm text-[var(--color-faint)]">
              Recorded. After three of these in a row the dial-in moves on to a different
              explanation rather than repeating itself.
            </p>
          )}
        </div>
      )}

      {beans.length > 0 && (
        <div className="mt-8">
          <label
            htmlFor="bean"
            className="text-sm uppercase tracking-widest text-[var(--color-muted)]"
          >
            Which bag?
          </label>
          <Select
            id="bean"
            label="Which bag?"
            value={beanId}
            onChange={setBeanId}
            className="mt-2"
            options={[
              { value: '', label: 'Not recorded' },
              ...beans.map((b) => ({
                value: b.id,
                label: b.name,
                hint: [b.roaster, `${b.remainingG} g left`].filter(Boolean).join(' · '),
              })),
            ]}
          />
          {beanId &&
            (() => {
              const bean = beans.find((b) => b.id === beanId)
              if (!bean) return null
              const left = brewsLeft(bean, recipe.doseG) - 1
              return (
                <p className="mt-2 text-sm text-[var(--color-faint)]">
                  {recipe.doseG} g comes off this bag when you save
                  {left >= 0 && `, leaving about ${left} more brew${left === 1 ? '' : 's'}`}.
                </p>
              )
            })()}
        </div>
      )}

      <div className="mt-8">
        <label
          htmlFor="score"
          className="text-sm uppercase tracking-widest text-[var(--color-muted)]"
        >
          Score · <span className="text-[var(--color-ink)]">{score}</span>/10
        </label>
        <input
          id="score"
          type="range"
          min={1}
          max={10}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="mt-3 w-full"
        />
      </div>

      <fieldset className="mt-8">
        <legend className="text-sm uppercase tracking-widest text-[var(--color-muted)]">
          Quick tags
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTags((v) => (v.includes(t) ? v.filter((x) => x !== t) : [...v, t]))}
              className={`rounded-full border px-4 py-2 text-sm ${
                tags.includes(t)
                  ? 'border-[var(--color-accent)] bg-[var(--color-surface)]'
                  : 'border-[var(--color-line)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      <details className="mt-8 rounded-2xl border border-[var(--color-line)] p-4">
        <summary className="cursor-pointer text-sm uppercase tracking-widest text-[var(--color-muted)]">
          Measured (optional)
        </summary>
        <div className="mt-4 grid gap-4">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm">TDS %</span>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={tds}
              onChange={(e) => setTds(e.target.value)}
              placeholder="1.35"
              className="w-28 rounded-xl border border-[var(--color-line)] bg-transparent px-3 tabular-nums"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm">Beverage mass (g)</span>
            <input
              type="number"
              inputMode="decimal"
              value={beverageG}
              onChange={(e) => setBeverageG(e.target.value)}
              placeholder="estimated"
              className="w-28 rounded-xl border border-[var(--color-line)] bg-transparent px-3 tabular-nums"
            />
          </label>

          {ey && (
            <p className="text-sm">
              <span className="text-[var(--color-accent)]">
                {ey.eyPct.toFixed(1)} % extraction yield
              </span>
              {ey.estimated && (
                <span className="text-[var(--color-muted)]">
                  {' '}
                  (estimated — beverage mass not measured)
                </span>
              )}
              <span className="block text-[var(--color-muted)]">{explainZone(ey.zone)}</span>
            </p>
          )}
        </div>
      </details>

      <label className="mt-8 block">
        <span className="text-sm uppercase tracking-widest text-[var(--color-muted)]">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-xl border border-[var(--color-line)] bg-transparent p-3"
        />
      </label>

      {saved === 'error' && (
        <p className="mt-4 text-[var(--color-warn)]">Could not save: {error}</p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saved === 'saving'}
        className="mt-8 w-full rounded-2xl bg-[var(--color-accent)] py-5 text-lg font-semibold text-[var(--color-on-accent)] disabled:opacity-60"
      >
        {saved === 'saving' ? 'Saving…' : 'Save to journal'}
      </button>
    </div>
  )
}

function explainZone(zone: ReturnType<typeof controlChartZone>): string {
  switch (zone) {
    case 'ideal':
      return 'Inside the SCA Golden Cup box.'
    case 'under':
      return 'Under-extracted at an acceptable strength: grind finer, keep the ratio.'
    case 'over':
      return 'Over-extracted at an acceptable strength: grind coarser.'
    case 'weak':
      return 'Well extracted but weak: tighten the ratio, do not grind finer.'
    case 'strong':
      return 'Well extracted but strong: loosen the ratio or add bypass water.'
    case 'under-weak':
      return 'Under-extracted and weak: grind finer and tighten the ratio.'
    case 'under-strong':
      return 'Under-extracted but strong: grind finer and loosen the ratio.'
    case 'over-weak':
      return 'Over-extracted but weak: coarser grind and a tighter ratio.'
    case 'over-strong':
      return 'Over-extracted and strong: coarser grind and a looser ratio.'
  }
}
