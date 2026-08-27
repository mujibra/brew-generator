'use client'

import { Select } from '@/app/components/Select'
import type { FreshnessState } from '@/lib/calc/freshness'
import type { BeanRecord, BrewRecord } from '@/lib/db/repository'
import { beanAge, beanFreshness, brewsLeft, roastLabel } from '@/lib/shelf/bean'
import Link from 'next/link'

/**
 * Pick the bag before brewing, and see what it is — PRD F5, 5.3.
 *
 * This belongs before the timer rather than in the log sheet afterwards, for
 * three reasons: the freshness note is brewing advice you can still act on, the
 * app can warn you the bag is too light for this dose, and choosing while the
 * kettle boils beats reconstructing it from memory later.
 */

const FRESHNESS_TONE: Record<FreshnessState, 'good' | 'warn' | 'muted'> = {
  resting: 'muted',
  peak: 'good',
  good: 'good',
  fading: 'warn',
  stale: 'warn',
}

const FRESHNESS_LABEL: Record<FreshnessState, string> = {
  resting: 'Still resting',
  peak: 'At peak',
  good: 'Still good',
  fading: 'Fading',
  stale: 'Stale',
}

export function BeanChoice({
  beans,
  brews,
  beanId,
  doseG,
  onChange,
}: {
  beans: BeanRecord[]
  brews: BrewRecord[]
  beanId: string | undefined
  doseG: number
  onChange: (id: string | undefined) => void
}) {
  if (beans.length === 0) {
    return (
      <Link
        href="/shelf/"
        className="tap block rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3"
      >
        <span className="block text-sm font-medium">Add a bag to your shelf</span>
        <span className="mt-1 block text-sm text-[var(--color-muted)]">
          Then the app tracks what is left, how fresh it is, and how your brews from it score.
        </span>
      </Link>
    )
  }

  const bean = beans.find((b) => b.id === beanId)
  const now = Date.now()

  return (
    <div>
      <label
        htmlFor="brew-bean"
        className="text-xs uppercase tracking-widest text-[var(--color-muted)]"
      >
        Brewing which bag?
      </label>
      <Select
        id="brew-bean"
        label="Brewing which bag?"
        value={beanId ?? ''}
        onChange={(v) => onChange(v || undefined)}
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

      {bean && <BeanProfile bean={bean} brews={brews} doseG={doseG} now={now} />}
    </div>
  )
}

function BeanProfile({
  bean,
  brews,
  doseG,
  now,
}: {
  bean: BeanRecord
  brews: BrewRecord[]
  doseG: number
  now: number
}) {
  const fresh = beanFreshness(bean, brews, now)
  const age = beanAge(bean, now)
  const left = brewsLeft(bean, doseG)
  const short = bean.remainingG < doseG
  const remainingAfter = Math.max(0, bean.remainingG - doseG)

  const provenance = [bean.country, bean.region].filter(Boolean).join(', ')
  const botany = [bean.variety, bean.process].filter(Boolean).join(' · ')

  return (
    <div className="mt-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      {(provenance || botany || bean.roastLevel) && (
        <p className="text-sm text-[var(--color-muted)]">
          {[
            provenance,
            botany,
            roastLabel(bean.roastLevel),
            bean.altitudeMasl && `${bean.altitudeMasl} masl`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {bean.roasterNotes && (
        <p className="mt-2 text-sm italic text-[var(--color-faint)]">“{bean.roasterNotes}”</p>
      )}

      {/* Freshness is the part you can still act on before pouring. */}
      {fresh && (
        <div className="mt-3 border-t border-[var(--color-line)] pt-3">
          <p className="text-sm">
            <span
              className={
                FRESHNESS_TONE[fresh.state] === 'good'
                  ? 'font-medium text-[var(--color-good-ink)]'
                  : FRESHNESS_TONE[fresh.state] === 'warn'
                    ? 'font-medium text-[var(--color-warn)]'
                    : 'font-medium text-[var(--color-muted)]'
              }
            >
              {FRESHNESS_LABEL[fresh.state]}
            </span>
            <span className="text-[var(--color-faint)]">
              {age !== undefined && ` · ${age} day${age === 1 ? '' : 's'} off roast`}
              {fresh.personalised && ' · your own window'}
            </span>
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{fresh.note}</p>
        </div>
      )}

      {/* What this brew costs the bag. PRD F5 R4. */}
      <div className="mt-3 border-t border-[var(--color-line)] pt-3">
        {short ? (
          <p className="text-sm text-[var(--color-warn)]">
            Only {bean.remainingG} g left and this recipe wants {doseG} g. You can still brew — the
            bag will just read 0 g afterwards.
          </p>
        ) : (
          <p className="text-sm">
            <span className="tabular-nums">{bean.remainingG} g</span>
            <span className="text-[var(--color-faint)]"> now · </span>
            <span className="tabular-nums text-[var(--color-accent)]">{remainingAfter} g</span>
            <span className="text-[var(--color-faint)]">
              {' '}
              after this brew · {Math.max(0, left - 1)} more brew
              {Math.max(0, left - 1) === 1 ? '' : 's'} at {doseG} g
            </span>
          </p>
        )}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${bean.sizeG > 0 ? Math.min(100, (remainingAfter / bean.sizeG) * 100) : 0}%`,
              background: short || left <= 2 ? 'var(--color-warn)' : 'var(--color-good-ink)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
