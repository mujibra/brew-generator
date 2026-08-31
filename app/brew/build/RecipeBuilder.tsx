'use client'

import { Select } from '@/app/components/Select'
import { compileRecipe } from '@/lib/brew/steps'
import { formatElapsed } from '@/lib/brew/timer'
import type { RoastLevel } from '@/lib/calc/freshness'
import { repository } from '@/lib/db/dexie'
import type { BeanRecord, SettingsRecord } from '@/lib/db/repository'
import { baselineFor, emptyGear, grinderOf } from '@/lib/gear/store'
import { GRINDERS } from '@/lib/grinders/registry'
import { BREWER_LIST, type BrewerId } from '@/lib/recipes/brewers'
import { type BrewGoal, GOALS, generateRecipe, toRunnable } from '@/lib/recipes/generate'
import { PROCESSES, type ProcessId } from '@/lib/recipes/process'
import { beanToGenerateInput, summariseShelf } from '@/lib/shelf/bean'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const ROASTS: { id: RoastLevel; label: string; hint: string }[] = [
  { id: 'veryLight', label: 'Very light', hint: 'Nordic. Pale, dense, very acidic.' },
  { id: 'light', label: 'Light', hint: 'Most specialty filter coffee.' },
  { id: 'mediumLight', label: 'Medium-light', hint: 'Light brown, no oil on the bean.' },
  { id: 'medium', label: 'Medium', hint: 'Balanced, mainstream specialty.' },
  { id: 'mediumDark', label: 'Medium-dark', hint: 'Some sheen, bittersweet.' },
  { id: 'dark', label: 'Dark', hint: 'Oily, smoky, low acidity.' },
]

const STORAGE_KEY = 'extraction:generated'

export function RecipeBuilder() {
  const router = useRouter()
  const params = useSearchParams()
  const [brewerId, setBrewerId] = useState<BrewerId>('v60')
  const [goal, setGoal] = useState<BrewGoal>('sweetness')
  const [roastLevel, setRoastLevel] = useState<RoastLevel>('light')
  const [doseG, setDoseG] = useState(20)
  const [altitude, setAltitude] = useState('')
  const [daysOffRoast, setDaysOffRoast] = useState('')
  const [beans, setBeans] = useState<BeanRecord[]>([])
  const [beanId, setBeanId] = useState('')
  const [gear, setGear] = useState<SettingsRecord | null>(null)

  // Grinder and baseline come from Gear, so they are set once rather than
  // retyped here on every visit (PRD F6 R3).
  useEffect(() => {
    repository()
      .settings.get('gear')
      .then((row) => setGear(row ?? emptyGear(Date.now())))
      .catch(() => setGear(emptyGear(Date.now())))
  }, [])
  const [pourOverride, setPourOverride] = useState<{ a: number; b: number } | null>(null)
  const [ratioOverride, setRatioOverride] = useState<number | null>(null)
  const [iced, setIced] = useState(false)
  const [icePct, setIcePct] = useState<number | null>(null)
  const [processId, setProcessId] = useState<ProcessId | ''>('')

  const brewer = BREWER_LIST.find((b) => b.id === brewerId)!
  const isImmersion = brewer.mode === 'immersion'

  // The bag already knows its roast, altitude and age — no reason to retype it.
  useEffect(() => {
    repository()
      .beans.all()
      .then((all) => {
        const active = summariseShelf(all, Date.now(), 20).active
        setBeans(active)
        const requested = params.get('bean')
        if (requested && active.some((b) => b.id === requested)) setBeanId(requested)
      })
      .catch(() => setBeans([]))
  }, [params])

  const selectedBean = beans.find((b) => b.id === beanId)
  const grinder = grinderOf(gear ?? undefined)
  const grinderId = gear?.grinderId ?? ''
  const baseline = baselineFor(gear ?? undefined, brewerId)

  // Applying a bag writes into the visible controls, so what you see is always
  // what the generator is actually using.
  useEffect(() => {
    if (!selectedBean) return
    const fromBean = beanToGenerateInput(selectedBean, Date.now())
    if (fromBean.roastLevel) setRoastLevel(fromBean.roastLevel)
    setAltitude(fromBean.altitudeMasl !== undefined ? String(fromBean.altitudeMasl) : '')
    setDaysOffRoast(fromBean.daysOffRoast !== undefined ? String(fromBean.daysOffRoast) : '')
    setProcessId(fromBean.processId ?? '')
  }, [selectedBean])

  const result = useMemo(() => {
    if (!Number.isFinite(doseG) || doseG <= 0) return null
    try {
      const recipe = generateRecipe({
        brewerId,
        doseG,
        goal,
        roastLevel,
        ...(altitude === '' ? {} : { altitudeMasl: Number(altitude) }),
        ...(daysOffRoast === '' ? {} : { daysOffRoast: Number(daysOffRoast) }),
        ...(ratioOverride === null ? {} : { ratioOverride }),
        ...(iced ? { iced: true } : {}),
        ...(iced && icePct !== null ? { iceFractionOverride: icePct / 100 } : {}),
        ...(processId === '' ? {} : { processId }),
        ...(gear?.myWater ? { water: gear.myWater } : {}),
        ...(grinderId === '' ? {} : { grinderId }),
        ...(baseline === undefined ? {} : { baselineSetting: baseline }),
        ...(pourOverride ? { poursOverride: pourOverride } : {}),
      })
      const compiled = compileRecipe({
        doseG: recipe.doseG,
        prep: recipe.prep,
        steps: recipe.steps,
      })
      return { recipe, compiled }
    } catch {
      return null
    }
  }, [
    brewerId,
    goal,
    roastLevel,
    doseG,
    altitude,
    daysOffRoast,
    grinderId,
    baseline,
    pourOverride,
    ratioOverride,
    iced,
    icePct,
    processId,
    gear?.myWater,
  ])

  const plan = result?.recipe.pourPlan
  const pours = pourOverride ?? plan?.counts ?? { a: 1, b: 2 }

  function setPours(next: { a: number; b: number }) {
    setPourOverride({ a: Math.max(0, next.a), b: Math.max(1, next.b) })
  }

  function brewIt() {
    if (!result) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toRunnable(result.recipe)))
    router.push('/brew/custom/')
  }

  return (
    <div className="pb-28">
      {/* Sticky summary: the numbers stay visible while you change the inputs. */}
      {result && (
        <div className="sticky top-0 z-20 border-b-2 border-[var(--color-line)] bg-[var(--color-bg)]">
          <div className="mx-auto flex max-w-2xl items-center gap-4 px-5 py-3">
            <Link href="/brew/" className="shrink-0 text-sm text-[var(--color-muted)]">
              ←
            </Link>
            <dl className="flex flex-1 items-baseline justify-between gap-3 text-sm tabular-nums">
              <SummaryItem label="Dose" value={`${result.recipe.doseG} g`} />
              <SummaryItem label="Water" value={`${result.recipe.waterG} g`} />
              <SummaryItem label="Ratio" value={`1:${result.recipe.ratio}`} />
              <SummaryItem label="Temp" value={`${result.recipe.waterTempC}°`} />
              <SummaryItem
                label="Time"
                value={formatElapsed(result.compiled.totalS * 1000)}
                hideOnNarrow
              />
            </dl>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Build a recipe</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Your gear, your bean, what you want in the cup. Everything below recalculates as you
          change it.
        </p>

        <Step n={1} title="Brewer">
          <Grid>
            {BREWER_LIST.map((b) => (
              <Card
                key={b.id}
                group="brewer"
                selected={brewerId === b.id}
                onSelect={() => setBrewerId(b.id)}
                title={b.name}
                subtitle={b.character}
              />
            ))}
          </Grid>
        </Step>

        <Step n={2} title="What do you want from the cup?">
          <Grid>
            {GOALS.map((g) => (
              <Card
                key={g.id}
                group="goal"
                selected={goal === g.id}
                onSelect={() => {
                  setGoal(g.id)
                  setPourOverride(null)
                }}
                title={g.label}
                subtitle={g.blurb}
              />
            ))}
          </Grid>
          <Hint>Changing this resets the suggested pour count in step 7.</Hint>
        </Step>

        <Step n={3} title="Roast level">
          <div role="radiogroup" aria-label="Roast level" className="flex flex-wrap gap-2">
            {ROASTS.map((r) => (
              <Pill
                key={r.id}
                selected={roastLevel === r.id}
                onSelect={() => setRoastLevel(r.id)}
                label={r.label}
              />
            ))}
          </div>
          <Hint>
            {ROASTS.find((r) => r.id === roastLevel)?.hint} This is the single biggest lever on
            grind and temperature.
          </Hint>
        </Step>

        <Step n={4} title="Processing">
          <div role="radiogroup" aria-label="Processing method" className="flex flex-wrap gap-2">
            <Pill selected={processId === ''} onSelect={() => setProcessId('')} label="Not sure" />
            {PROCESSES.map((p) => (
              <Pill
                key={p.id}
                selected={processId === p.id}
                onSelect={() => setProcessId(p.id)}
                label={p.label}
              />
            ))}
          </div>
          <Hint>
            {processId === ''
              ? 'How the fruit was taken off the seed. It decides how much fermentation sugar the bean carries, which is the second-biggest lever after roast level. Pick a bag below and this fills itself in.'
              : PROCESSES.find((p) => p.id === processId)?.blurb}
          </Hint>
        </Step>

        <Step n={5} title="The bean">
          {beans.length > 0 && (
            <div className="mb-3 rounded-lg bg-[var(--color-surface)] p-4">
              <label htmlFor="bean" className="text-sm">
                Use a bag from your shelf
              </label>
              <Select
                id="bean"
                label="Use a bag from your shelf"
                value={beanId}
                onChange={setBeanId}
                className="mt-2"
                options={[
                  { value: '', label: 'Not using a saved bag' },
                  ...beans.map((b) => ({
                    value: b.id,
                    label: b.name,
                    hint: b.roaster || undefined,
                  })),
                ]}
              />
              {selectedBean && (
                <p className="mt-2 text-sm text-[var(--color-faint)]">
                  Roast level, altitude and age are filled in from this bag. Change anything below
                  and the recipe follows.
                </p>
              )}
            </div>
          )}
          <div className="rounded-lg bg-[var(--color-surface)] p-4">
            <Stepper
              label="Dose"
              unit="g"
              value={doseG}
              min={brewer.doseRangeG.min}
              max={brewer.doseRangeG.max}
              step={1}
              onChange={setDoseG}
              hint={`This ${brewer.name} works best between ${brewer.doseRangeG.min} and ${brewer.doseRangeG.max} g.`}
            />
            <Divider />
            <Stepper
              label="Ratio"
              unit={`1:${(ratioOverride ?? result?.recipe.ratio ?? 16).toFixed(1).replace(/\.0$/, '')}`}
              value={ratioOverride ?? result?.recipe.ratio ?? 16}
              min={12}
              max={20}
              step={0.5}
              onChange={setRatioOverride}
              hint={
                ratioOverride === null
                  ? `Chosen for ${goal}. More water per gram is a lighter cup at the same extraction.`
                  : `${result ? Math.round(1000 / result.recipe.ratio) : ''} g per litre. Ratio sets strength, not sour or bitter.`
              }
            />
            {ratioOverride !== null && (
              <button
                type="button"
                onClick={() => setRatioOverride(null)}
                className="compact mt-2 rounded-full bg-[var(--color-raised)] px-3 text-sm font-semibold text-[var(--color-muted)] transition-all duration-200 hover:bg-[var(--color-line)] hover:text-[var(--color-ink)]"
              >
                Use the suggestion for {goal}
              </button>
            )}
            <Divider />
            <button
              type="button"
              onClick={() => setIced(!iced)}
              aria-pressed={iced}
              className={`w-full rounded-lg px-4 py-3 text-left transition-all duration-200 ${
                iced
                  ? 'bg-[var(--color-accent)] text-[var(--color-on-accent)]'
                  : 'bg-[var(--color-surface)] hover:bg-[var(--color-raised)]'
              }`}
            >
              <span className="block font-medium">Japanese iced</span>
              <span className="mt-1 block text-sm text-[var(--color-muted)]">
                {iced && result?.recipe.iced
                  ? `${result.recipe.ice.hotWaterG} g hot onto ${result.recipe.ice.iceG} g of ice — same total, full strength.`
                  : 'Brew hot straight onto ice. Chills in seconds and keeps the aromatics a slow cool-down loses.'}
              </span>
            </button>
            {iced && (
              <div className="mt-3 rounded-lg bg-[var(--color-raised)] p-4">
                <Stepper
                  label="Ice"
                  unit="%"
                  value={icePct ?? Math.round((result?.recipe.ice.fraction ?? 0.4) * 100)}
                  min={25}
                  max={60}
                  step={5}
                  onChange={setIcePct}
                  hint={
                    result?.recipe.iced
                      ? `The bed sees 1:${result.recipe.ice.hotRatio} — that is where the extraction happens, even though the drink lands at 1:${result.recipe.ratio}. More ice chills harder and brews a stronger concentrate.`
                      : 'Share of the water sitting in the carafe as ice.'
                  }
                />
                {icePct !== null && icePct !== 40 && (
                  <button
                    type="button"
                    onClick={() => setIcePct(null)}
                    className="compact mt-2 rounded-full bg-[var(--color-raised)] px-3 text-sm font-semibold text-[var(--color-muted)] transition-all duration-200 hover:bg-[var(--color-line)] hover:text-[var(--color-ink)]"
                  >
                    Back to 40 %
                  </button>
                )}
                <Link
                  href="/learn/extraction/flash-brew/"
                  className="mt-3 block text-sm text-[var(--color-accent)]"
                >
                  How flash brew works, and the two ratios →
                </Link>
              </div>
            )}
            <Divider />
            <NumberField
              label="Altitude"
              unit="masl"
              value={altitude}
              onChange={setAltitude}
              hint="Higher-grown beans are denser and resist extraction. Leave blank if the bag does not say."
            />
            <Divider />
            <NumberField
              label="Days off roast"
              unit="days"
              value={daysOffRoast}
              onChange={setDaysOffRoast}
              hint="Under 5 days there is still a lot of CO₂, which changes the bloom."
            />
          </div>
        </Step>

        <Step n={6} title="Grinder">
          {grinder ? (
            <div className="rounded-lg bg-[var(--color-surface)] p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{grinder.name}</span>
                  <span className="block text-sm text-[var(--color-faint)]">
                    {baseline !== undefined
                      ? `Your ${brewer.name} baseline: ${baseline} ${grinder.unitLabel}`
                      : `No ${brewer.name} baseline set yet`}
                  </span>
                </span>
                <Link
                  href="/gear/"
                  className="tap compact shrink-0 rounded-lg bg-[var(--color-raised)] px-4 text-sm font-semibold leading-10 transition-all duration-200 hover:bg-[var(--color-line)]"
                >
                  Change
                </Link>
              </div>
              {baseline === undefined && (
                <p className="mt-3 text-sm text-[var(--color-muted)]">
                  Without a baseline the grind figure below is an absolute estimate. Set your usual
                  setting in Gear and it becomes an offset from something you know works.
                </p>
              )}
            </div>
          ) : (
            <Link href="/gear/" className="tap block rounded-lg bg-[var(--color-surface)] p-4">
              <span className="block font-medium">Set your grinder</span>
              <span className="mt-1 block text-sm text-[var(--color-muted)]">
                Then the grind below arrives in your own clicks instead of microns.
              </span>
            </Link>
          )}
        </Step>

        {!isImmersion && (
          <Step n={7} title="How many pours?">
            <div className="rounded-lg bg-[var(--color-surface)] p-4">
              <Stepper
                label="First 40 % of the water"
                unit={pours.a === 1 ? 'pour' : 'pours'}
                value={pours.a}
                min={0}
                max={4}
                step={1}
                onChange={(v) => setPours({ ...pours, a: v })}
                hint="This block sets the balance between acidity and sweetness. More, smaller pours land sweeter."
              />
              <Divider />
              <Stepper
                label="Last 60 % of the water"
                unit={pours.b === 1 ? 'pour' : 'pours'}
                value={pours.b}
                min={1}
                max={5}
                step={1}
                onChange={(v) => setPours({ ...pours, b: v })}
                hint="This block sets strength. More pours build a stronger, fuller cup."
              />

              <Divider />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[var(--color-muted)]">
                  {pours.a + pours.b} pours after the bloom
                  {plan && (
                    <>
                      {' · '}
                      {plan.overridden ? (
                        <span>
                          suggested {plan.suggested.a} + {plan.suggested.b} for {goal}
                        </span>
                      ) : (
                        <span className="text-[var(--color-accent)]">suggested for {goal}</span>
                      )}
                    </>
                  )}
                </p>
                {pourOverride && (
                  <button
                    type="button"
                    onClick={() => setPourOverride(null)}
                    className="compact rounded-full bg-[var(--color-raised)] px-3 text-sm font-semibold text-[var(--color-muted)] transition-all duration-200 hover:bg-[var(--color-line)] hover:text-[var(--color-ink)]"
                  >
                    Use the suggestion
                  </button>
                )}
              </div>

              {plan?.overCap && (
                <p className="mt-3 rounded-lg bg-[var(--color-raised)] p-3 text-sm text-[var(--color-warn)]">
                  More than the {brewer.maxPours} pours this bed comfortably takes. Every extra pour
                  adds agitation.
                </p>
              )}
            </div>
          </Step>
        )}

        {isImmersion && (
          <Step n={7} title="Pours">
            <p className="rounded-lg bg-[var(--color-surface)] p-4 text-[var(--color-muted)]">
              {brewer.name} is full immersion — one pour, then the steep does the work. Pour count
              is not a lever here.
            </p>
          </Step>
        )}

        {/* --- The manual */}
        {result && (
          <section className="mt-14">
            <h2 className="text-2xl font-semibold">Your recipe</h2>

            {result.recipe.iced && (
              <div className="mt-4 rounded-lg bg-[var(--color-accent-soft)] p-4">
                <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
                  Japanese iced
                </p>
                <p className="mt-1 text-xl font-medium tabular-nums">
                  {result.recipe.ice.hotWaterG} g hot
                  <span className="text-[var(--color-faint)]"> onto </span>
                  {result.recipe.ice.iceG} g ice
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  The ice is part of the {result.recipe.waterG} g, not extra — so it finishes at
                  full strength rather than watered down. The bed brews at 1:
                  {result.recipe.ice.hotRatio}, the drink lands at 1:{result.recipe.ratio}.
                </p>
              </div>
            )}

            <div className="mt-4 rounded-lg bg-[var(--color-surface)] p-4">
              <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">Grind</p>
              <p className="mt-1 text-xl font-medium">{result.recipe.grind.text}</p>
              <p className="mt-2 text-sm text-[var(--color-faint)]">{result.recipe.grind.caveat}</p>
            </div>

            {result.recipe.warnings.map((w) => (
              <p
                key={w}
                className="mt-3 rounded-lg bg-[var(--color-warn-block)] p-4 text-sm font-medium text-[var(--color-warn)]"
              >
                {w}
              </p>
            ))}

            <h3 className="mt-8 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
              Before you start
            </h3>

            <ol className="mt-3 space-y-2">
              {result.recipe.prep.map((step, i) => (
                <li
                  key={step.label}
                  className="flex gap-4 rounded-lg bg-[var(--color-surface)] px-4 py-3"
                >
                  <span className="w-12 shrink-0 font-mono text-sm tabular-nums text-[var(--color-faint)]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{step.label}</span>
                    <span className="mt-1 block text-sm text-[var(--color-muted)]">
                      {step.instruction}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            <h3 className="mt-8 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
              Pour schedule · total {formatElapsed(result.compiled.totalS * 1000)}
            </h3>

            <ol className="mt-3 space-y-2">
              {result.recipe.pours.map((p) => (
                <li
                  key={p.index}
                  className="flex items-center gap-4 rounded-lg bg-[var(--color-surface)] px-4 py-3"
                >
                  <span className="w-12 shrink-0 font-mono text-sm tabular-nums text-[var(--color-muted)]">
                    {formatElapsed(p.startS * 1000)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{p.label}</span>
                    <span className="block text-xs uppercase tracking-wide text-[var(--color-faint)]">
                      {p.phase === 'bloom'
                        ? 'bloom'
                        : p.phase === 'A'
                          ? 'first 40 %'
                          : p.phase === 'B'
                            ? 'last 60 %'
                            : 'fill'}
                      {' · '}
                      {p.pourS}s pour
                    </span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block text-lg font-semibold text-[var(--color-accent)]">
                      {p.toG} g
                    </span>
                    <span className="block text-xs text-[var(--color-faint)]">
                      +{Math.round(p.addG)} g
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            <h3 className="mt-10 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
              Why these numbers
            </h3>
            <div className="mt-3 space-y-2">
              {result.recipe.rationale.map((s) => (
                <details key={s.heading} className="rounded-lg bg-[var(--color-surface)] px-4 py-3">
                  <summary className="cursor-pointer list-none">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-[var(--color-muted)]">{s.heading}</span>
                      <span className="text-right font-medium">{s.value}</span>
                    </span>
                  </summary>
                  <ul className="mt-3 space-y-2 border-t-2 border-[var(--color-line)] pt-3 text-sm text-[var(--color-muted)]">
                    {s.lines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Sticky action: never hunt for the button at the bottom of a long form. */}
      {result && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-[var(--color-line)] bg-[var(--color-bg)] px-5 py-3">
          <div className="mx-auto max-w-2xl">
            <button
              type="button"
              onClick={brewIt}
              className="w-full rounded-lg bg-[var(--color-accent)] py-4 text-lg font-semibold text-[var(--color-on-accent)]"
            >
              Brew this · {result.recipe.doseG}:{result.recipe.waterG} ·{' '}
              {formatElapsed(result.compiled.totalS * 1000)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Pieces

function SummaryItem({
  label,
  value,
  hideOnNarrow,
}: {
  label: string
  value: string
  hideOnNarrow?: boolean
}) {
  return (
    <div className={hideOnNarrow ? 'hidden sm:block' : ''}>
      <dt className="text-[10px] uppercase tracking-widest text-[var(--color-faint)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-line)] text-xs font-bold tabular-nums text-[var(--color-ink)]">
          {n}
        </span>
        <span className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
          {title}
        </span>
      </h2>
      {children}
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-2">{children}</div>
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm text-[var(--color-faint)]">{children}</p>
}

function Divider() {
  return <div className="my-4 h-0.5 rounded-full bg-[var(--color-line)]" />
}

function Card({
  group,
  selected,
  onSelect,
  title,
  subtitle,
}: {
  group: string
  selected: boolean
  onSelect: () => void
  title: string
  subtitle: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`${group}: ${title}`}
      onClick={onSelect}
      className={`rounded-lg px-4 py-3 text-left transition-all duration-200 ${
        selected
          ? 'bg-[var(--color-accent)] text-[var(--color-on-accent)]'
          : 'bg-[var(--color-surface)] hover:scale-[1.02] hover:bg-[var(--color-raised)]'
      }`}
    >
      <span className="flex items-start gap-2">
        <span
          aria-hidden
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
            selected ? 'bg-[var(--color-on-accent)]' : 'bg-[var(--color-line-strong)]'
          }`}
        />
        <span className="min-w-0">
          <span className="block font-bold tracking-tight">{title}</span>
          <span
            className={`mt-0.5 block text-sm leading-snug ${
              selected ? 'text-[var(--color-on-accent)]' : 'text-[var(--color-faint)]'
            }`}
          >
            {subtitle}
          </span>
        </span>
      </span>
    </button>
  )
}

function Pill({
  selected,
  onSelect,
  label,
}: {
  selected: boolean
  onSelect: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`rounded-full px-4 text-sm font-semibold transition-all duration-200 ${
        selected
          ? 'bg-[var(--color-accent)] text-[var(--color-on-accent)]'
          : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-ink)]'
      }`}
    >
      {label}
    </button>
  )
}

function Stepper({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  hint?: string
}) {
  const clamped = (v: number) => Math.min(max, Math.max(min, v))
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm">{label}</span>
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Decrease ${label}`}
            onClick={() => onChange(clamped(value - step))}
            disabled={value <= min}
            className="h-11 w-11 rounded-lg bg-[var(--color-raised)] text-lg font-bold transition-all duration-200 hover:bg-[var(--color-line)] disabled:opacity-30 disabled:hover:bg-[var(--color-raised)]"
          >
            −
          </button>
          <span className="w-20 text-center tabular-nums">
            <span className="text-lg font-semibold">{value}</span>
            <span className="ml-1 text-sm text-[var(--color-muted)]">{unit}</span>
          </span>
          <button
            type="button"
            aria-label={`Increase ${label}`}
            onClick={() => onChange(clamped(value + step))}
            disabled={value >= max}
            className="h-11 w-11 rounded-lg bg-[var(--color-raised)] text-lg font-bold transition-all duration-200 hover:bg-[var(--color-line)] disabled:opacity-30 disabled:hover:bg-[var(--color-raised)]"
          >
            +
          </button>
        </span>
      </div>
      {hint && <p className="mt-2 text-sm text-[var(--color-faint)]">{hint}</p>}
    </div>
  )
}

function NumberField({
  label,
  unit,
  value,
  onChange,
  hint,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm">{label}</span>
        <span className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="optional"
            className="h-11 w-24 rounded-lg bg-[var(--color-raised)] px-3 text-right tabular-nums outline-none focus:bg-[var(--color-bg)] focus:ring-2 focus:ring-[var(--color-accent)]"
          />
          <span className="w-10 text-sm text-[var(--color-muted)]">{unit}</span>
        </span>
      </span>
      {hint && <span className="mt-2 block text-sm text-[var(--color-faint)]">{hint}</span>}
    </label>
  )
}
