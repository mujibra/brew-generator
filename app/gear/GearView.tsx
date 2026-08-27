'use client'

import { Select } from '@/app/components/Select'
import { browserCapabilities } from '@/lib/capability/browser'
import { repository } from '@/lib/db/dexie'
import type { SettingsRecord } from '@/lib/db/repository'
import {
  baselineCount,
  baselineFor,
  emptyGear,
  grinderOf,
  setBaseline,
  setGrinder,
} from '@/lib/gear/store'
import { GRINDERS, describeGrind, grindAdvice } from '@/lib/grinders/registry'
import { BREWER_LIST } from '@/lib/recipes/brewers'
import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * Gear — PRD F6.
 *
 * The point of this screen is the baselines. An absolute micron figure across
 * grinders is not trustworthy enough to state flatly (F6 R1); an offset from
 * the user's own known-good setting is (F6 R3). This is where that gets
 * recorded once instead of retyped on every screen.
 */
export function GearView() {
  const [gear, setGear] = useState<SettingsRecord | null>(null)

  useEffect(() => {
    repository()
      .settings.get('gear')
      .then((row) => setGear(row ?? emptyGear(Date.now())))
      .catch(() => setGear(emptyGear(Date.now())))
  }, [])

  async function save(next: SettingsRecord) {
    setGear(next)
    await repository().settings.put({ ...next, updatedAt: Date.now() })
  }

  if (!gear) {
    return (
      <Shell>
        <p className="mt-10 text-[var(--color-muted)]">Loading…</p>
      </Shell>
    )
  }

  const grinder = grinderOf(gear)
  const count = baselineCount(gear)
  const scale = browserCapabilities.scale.check()

  return (
    <Shell>
      <p className="mt-2 text-[var(--color-muted)]">
        Set this once and every recipe and every dial-in suggestion arrives in your grinder's own
        clicks.
      </p>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
          Grinder
        </h2>
        <Select
          label="Grinder"
          value={gear.grinderId ?? ''}
          onChange={(v) => save(setGrinder(gear, v || undefined))}
          placeholder="Not set"
          options={[
            { value: '', label: 'Not set' },
            ...GRINDERS.map((g) => ({
              value: g.id,
              label: g.name,
              hint:
                g.micronsPerUnit > 0
                  ? `${g.burrType} · ${g.micronsPerUnit} µm per ${g.unitLabel.replace(/s$/, '')}`
                  : 'no published step size',
            })),
          ]}
        />

        {grinder && (
          <div className="mt-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Fact label="Burrs" value={grinder.burrType === 'flat' ? 'Flat' : 'Conical'} />
              <Fact label="Adjustment" value={grinder.unitLabel} />
              {grinder.micronsPerUnit > 0 && (
                <Fact label="Per click" value={`≈ ${grinder.micronsPerUnit} µm`} />
              )}
              <Fact label="Confidence" value={grinder.confidence} />
            </dl>
            {grinder.note && (
              <p className="mt-3 text-sm text-[var(--color-muted)]">{grinder.note}</p>
            )}
            {grinder.micronsPerUnit === 0 && (
              <p className="mt-3 text-sm text-[var(--color-warn)]">
                No step size for this grinder, so advice stays descriptive until you set a baseline
                below. Once you do, it becomes exact offsets from your own setting.
              </p>
            )}
          </div>
        )}
      </section>

      {grinder && (
        <section className="mt-8">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
            Your baselines · {count} of {BREWER_LIST.length}
          </h2>
          <p className="mb-3 text-sm text-[var(--color-faint)]">
            For each brewer you use, the setting you already know works. This is the single most
            valuable thing you can tell the app — it turns every suggestion from a guess into a
            delta from something true.
          </p>

          <ul className="space-y-2">
            {BREWER_LIST.map((brewer) => {
              const current = baselineFor(gear, brewer.id)
              const advice =
                grinder.micronsPerUnit > 0
                  ? grindAdvice(grinder, brewer.baseMicrons, current, brewer.baseMicrons)
                  : undefined
              return (
                <li
                  key={brewer.id}
                  className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{brewer.name}</span>
                      <span className="block text-xs text-[var(--color-faint)]">
                        typically {describeGrind(brewer.baseMicrons)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <BaselineInput
                        label={`Baseline setting for ${brewer.name}`}
                        value={current}
                        onCommit={(v) => save(setBaseline(gear, brewer.id, v))}
                      />
                      <span className="w-12 text-xs text-[var(--color-faint)]">
                        {grinder.unitLabel}
                      </span>
                    </span>
                  </div>
                  {current !== undefined && advice && (
                    <p className="mt-2 text-xs text-[var(--color-accent)]">{advice.caveat}</p>
                  )}
                </li>
              )
            })}
          </ul>

          {count === 0 && (
            <p className="mt-3 rounded-xl bg-[var(--color-raised)] p-3 text-sm text-[var(--color-muted)]">
              Nothing set yet, so the app falls back to absolute micron estimates — usable, but
              treat them with suspicion. Fill in one brewer and the difference is immediate.
            </p>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
          Scale
        </h2>
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          {scale.available ? (
            <p className="text-sm">
              This browser supports Web Bluetooth. Scale protocol adapters are not built yet, so
              weighing stays manual for now.
            </p>
          ) : (
            <>
              <p className="text-sm text-[var(--color-muted)]">{scale.reason}</p>
              {scale.remedy && (
                <p className="mt-2 text-sm text-[var(--color-faint)]">{scale.remedy}</p>
              )}
            </>
          )}
        </div>
      </section>

      <p className="mt-8 text-sm text-[var(--color-faint)]">
        Stored in this browser only, and included in the journal export.
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/" className="text-sm text-[var(--color-muted)]">
        ← Extraction
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Gear</h1>
      {children}
    </main>
  )
}

/**
 * Baseline entry that shows exactly what was typed.
 *
 * A controlled `<input type="number">` fed a number will not drop a stray
 * leading zero, because React skips the DOM write when the numeric values match.
 * Holding the text and committing the parse avoids that entirely.
 */
function BaselineInput({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number | undefined
  onCommit: (v: number | undefined) => void
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value))

  // Follow the record when it changes underneath us (grinder swap clears these).
  useEffect(() => {
    setText(value === undefined ? '' : String(value))
  }, [value])

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      aria-label={label}
      value={text}
      placeholder="—"
      onChange={(e) => {
        setText(e.target.value)
        const n = Number(e.target.value)
        onCommit(e.target.value.trim() === '' || !Number.isFinite(n) || n < 0 ? undefined : n)
      }}
      className="w-20 rounded-xl border border-[var(--color-line)] bg-transparent px-3 text-right tabular-nums"
    />
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-[var(--color-faint)]">{label}</dt>
      <dd className="capitalize">{value}</dd>
    </div>
  )
}
