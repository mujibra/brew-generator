'use client'

import { PageBody, PageHeader } from '@/app/components/ui'

import type { FreshnessState } from '@/lib/calc/freshness'
import { repository } from '@/lib/db/dexie'
import type { BeanRecord, BrewRecord } from '@/lib/db/repository'
import {
  ROAST_LEVELS,
  beanAge,
  beanFreshness,
  beanTimeline,
  brewsLeft,
  emptyBean,
  isLowStock,
  roastLabel,
  summariseShelf,
} from '@/lib/shelf/bean'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { FreshnessTimeline } from './FreshnessTimeline'

const TYPICAL_DOSE_G = 20

const FRESHNESS_COPY: Record<FreshnessState, { label: string; tone: 'good' | 'warn' | 'muted' }> = {
  resting: { label: 'Resting', tone: 'muted' },
  peak: { label: 'At peak', tone: 'good' },
  good: { label: 'Still good', tone: 'good' },
  fading: { label: 'Fading', tone: 'warn' },
  stale: { label: 'Stale', tone: 'warn' },
}

export function ShelfView() {
  const [beans, setBeans] = useState<BeanRecord[] | null>(null)
  const [brews, setBrews] = useState<BrewRecord[]>([])
  const [editing, setEditing] = useState<BeanRecord | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    const repo = repository()
    Promise.all([repo.beans.all(), repo.brews.all()])
      .then(([b, br]) => {
        setBeans(b)
        setBrews(br)
      })
      .catch(() => setBeans([]))
  }, [])

  const now = Date.now()
  // Date.now() lives inside the memo: as a dependency it would change every
  // render and defeat the point of memoising.
  const shelf = useMemo(() => summariseShelf(beans ?? [], Date.now(), TYPICAL_DOSE_G), [beans])

  async function save(bean: BeanRecord) {
    await repository().beans.put(bean)
    setBeans((prev) => {
      const rest = (prev ?? []).filter((b) => b.id !== bean.id)
      return [...rest, bean]
    })
    setEditing(null)
    setOpenId(bean.id)
  }

  async function patch(id: string, changes: Partial<BeanRecord>) {
    const current = (beans ?? []).find((b) => b.id === id)
    if (!current) return
    const next = { ...current, ...changes }
    await repository().beans.put(next)
    setBeans((prev) => (prev ? prev.map((b) => (b.id === id ? next : b)) : prev))
  }

  async function remove(id: string) {
    await repository().beans.delete(id)
    setBeans((prev) => (prev ? prev.filter((b) => b.id !== id) : prev))
    setOpenId(null)
  }

  if (beans === null) {
    return (
      <Shell>
        <p className="mt-10 text-[var(--color-muted)]">Loading…</p>
      </Shell>
    )
  }

  if (editing) {
    return (
      <Shell>
        <BeanForm
          bean={editing}
          onSave={save}
          onCancel={() => setEditing(null)}
          onDelete={beans.some((b) => b.id === editing.id) ? () => remove(editing.id) : undefined}
        />
      </Shell>
    )
  }

  const list = showArchived ? shelf.archived : shelf.active

  return (
    <Shell>
      {beans.length === 0 ? (
        <div className="mt-12 rounded-lg bg-[var(--color-surface)] p-6 text-center">
          <h2 className="text-xl font-semibold">No beans on the shelf</h2>
          <p className="mt-2 text-[var(--color-muted)]">
            Add a bag and the app tracks its freshness, what is left, and how your brews from it
            score over time.
          </p>
          <button
            type="button"
            onClick={() => setEditing(emptyBean(crypto.randomUUID(), Date.now()))}
            className="mt-6 rounded-lg bg-[var(--color-accent)] px-6 py-3 font-semibold text-[var(--color-on-accent)]"
          >
            Add a bag
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-2">
            <Stat label="Bags" value={String(shelf.active.length)} />
            <Stat label="Coffee left" value={`${(shelf.totalRemainingG / 1000).toFixed(2)} kg`} />
            <Stat
              label="Running low"
              value={String(shelf.lowStock.length)}
              tone={shelf.lowStock.length > 0 ? 'warn' : undefined}
            />
          </div>

          {shelf.lowStock.length > 0 && (
            <p className="mt-3 rounded-lg bg-[var(--color-warn-block)] px-4 py-3 text-sm font-medium text-[var(--color-warn)]">
              {shelf.lowStock.map((b) => b.name || 'Unnamed bag').join(', ')} —{' '}
              {shelf.lowStock.length === 1 ? 'down to its' : 'down to their'} last couple of brews.
            </p>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
              {showArchived
                ? `Archived · ${shelf.archived.length}`
                : `On the shelf · ${shelf.active.length}`}
            </h2>
            {shelf.archived.length > 0 && (
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="compact text-sm text-[var(--color-muted)] underline"
              >
                {showArchived ? 'Show shelf' : 'Show archived'}
              </button>
            )}
          </div>

          <ul className="mt-3 space-y-2">
            {list.map((bean) => (
              <li key={bean.id}>
                <BeanCard
                  bean={bean}
                  brews={brews}
                  now={now}
                  open={openId === bean.id}
                  onToggle={() => setOpenId(openId === bean.id ? null : bean.id)}
                  onEdit={() => setEditing(bean)}
                  onPatch={patch}
                />
              </li>
            ))}
          </ul>

          {list.length === 0 && (
            <p className="mt-4 text-[var(--color-muted)]">
              {showArchived ? 'Nothing archived yet.' : 'Every bag is archived.'}
            </p>
          )}

          <button
            type="button"
            onClick={() => setEditing(emptyBean(crypto.randomUUID(), Date.now()))}
            className="mt-6 w-full rounded-lg bg-[var(--color-accent)] py-4 font-semibold text-[var(--color-on-accent)]"
          >
            Add a bag
          </button>
        </>
      )}
    </Shell>
  )
}

function BeanCard({
  bean,
  brews,
  now,
  open,
  onToggle,
  onEdit,
  onPatch,
}: {
  bean: BeanRecord
  brews: BrewRecord[]
  now: number
  open: boolean
  onToggle: () => void
  onEdit: () => void
  onPatch: (id: string, changes: Partial<BeanRecord>) => Promise<void>
}) {
  const age = beanAge(bean, now)
  const fresh = beanFreshness(bean, brews, now)
  const left = brewsLeft(bean, TYPICAL_DOSE_G)
  const timeline = beanTimeline(bean, brews)
  const low = isLowStock(bean, TYPICAL_DOSE_G)
  const tone = fresh ? FRESHNESS_COPY[fresh.state].tone : 'muted'

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full rounded-lg border-l-4 px-4 py-3 text-left transition-all duration-200 ${
          open
            ? 'border-[var(--color-accent)] bg-[var(--color-raised)]'
            : 'border-transparent bg-[var(--color-surface)] hover:bg-[var(--color-raised)]'
        }`}
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{bean.name || 'Unnamed bag'}</span>
            <span className="block truncate text-sm text-[var(--color-faint)]">
              {[bean.roaster, bean.country, roastLabel(bean.roastLevel)]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </span>
          <span className="shrink-0 text-right">
            {fresh && (
              <span
                className={`block text-sm ${
                  tone === 'good'
                    ? 'text-[var(--color-good-ink)]'
                    : tone === 'warn'
                      ? 'text-[var(--color-warn)]'
                      : 'text-[var(--color-muted)]'
                }`}
              >
                {FRESHNESS_COPY[fresh.state].label}
              </span>
            )}
            <span className="block text-xs tabular-nums text-[var(--color-faint)]">
              {age !== undefined ? `${age}d · ` : ''}
              {bean.remainingG} g
            </span>
          </span>
        </span>

        <span className="mt-2 flex items-center gap-2">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${bean.sizeG > 0 ? Math.min(100, (bean.remainingG / bean.sizeG) * 100) : 0}%`,
                background: low ? 'var(--color-warn)' : 'var(--color-good-ink)',
              }}
            />
          </span>
          <span
            className={`shrink-0 text-xs tabular-nums ${low ? 'text-[var(--color-warn)]' : 'text-[var(--color-faint)]'}`}
          >
            {left} brew{left === 1 ? '' : 's'} left
          </span>
        </span>
      </button>

      {open && (
        <div className="mt-2 rounded-lg bg-[var(--color-surface)] p-4">
          {fresh ? (
            <p className="text-sm">
              <span className="text-[var(--color-ink)]">{FRESHNESS_COPY[fresh.state].label}. </span>
              <span className="text-[var(--color-muted)]">{fresh.note}</span>
            </p>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              Add a roast date and roast level to get a freshness read on this bag.
            </p>
          )}

          {bean.roastLevel && bean.roastDate && (
            <div className="mt-4">
              <FreshnessTimeline
                roastLevel={bean.roastLevel}
                points={timeline}
                currentDay={age}
                personalPeak={fresh?.personalised ? fresh.window : undefined}
              />
            </div>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {bean.variety && <Fact label="Variety" value={bean.variety} />}
            {bean.process && <Fact label="Process" value={bean.process} />}
            {bean.altitudeMasl !== undefined && (
              <Fact label="Altitude" value={`${bean.altitudeMasl} masl`} />
            )}
            {bean.region && <Fact label="Region" value={bean.region} />}
            <Fact label="Bag" value={`${bean.remainingG} of ${bean.sizeG} g`} />
            <Fact label="Brews logged" value={String(timeline.length)} />
          </dl>

          {bean.roasterNotes && (
            <p className="mt-3 text-sm text-[var(--color-muted)]">
              <span className="text-[var(--color-faint)]">Roaster notes: </span>
              {bean.roasterNotes}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/brew/build/?bean=${bean.id}`}
              className="tap compact flex-1 rounded-lg bg-[var(--color-accent)] px-4 text-center text-sm font-semibold leading-10 text-[var(--color-on-accent)]"
            >
              Build a recipe for this
            </Link>
            <button
              type="button"
              onClick={onEdit}
              className="compact rounded-lg px-4 text-sm bg-[var(--color-raised)] font-semibold transition-all duration-200 hover:bg-[var(--color-line)]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => onPatch(bean.id, { archived: !bean.archived })}
              className="compact rounded-lg px-4 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] bg-[var(--color-raised)] font-semibold transition-all duration-200 hover:bg-[var(--color-line)]"
            >
              {bean.archived ? 'Unarchive' : 'Archive'}
            </button>
          </div>

          {bean.archived && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-[var(--color-muted)]">Buy again?</span>
              <button
                type="button"
                onClick={() => onPatch(bean.id, { wouldBuyAgain: true })}
                className={`compact rounded-full px-4 text-sm transition-all duration-200 ${
                  bean.wouldBuyAgain === true
                    ? 'bg-[var(--color-accent)] font-semibold text-[var(--color-on-accent)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-ink)]'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => onPatch(bean.id, { wouldBuyAgain: false })}
                className={`compact rounded-full px-4 text-sm transition-all duration-200 ${
                  bean.wouldBuyAgain === false
                    ? 'bg-[var(--color-raised)] font-semibold text-[var(--color-ink)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-ink)]'
                }`}
              >
                No
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function BeanForm({
  bean,
  onSave,
  onCancel,
  onDelete,
}: {
  bean: BeanRecord
  onSave: (b: BeanRecord) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}) {
  const [draft, setDraft] = useState(bean)
  const set = <K extends keyof BeanRecord>(key: K, value: BeanRecord[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  // Numeric fields live as strings while editing so the input shows exactly what
  // was typed; they are parsed once, on save.
  const [sizeText, setSizeText] = useState(String(bean.sizeG))
  const [leftText, setLeftText] = useState(String(bean.remainingG))
  const [altitudeText, setAltitudeText] = useState(
    bean.altitudeMasl === undefined ? '' : String(bean.altitudeMasl),
  )

  const parsed = (text: string, fallback: number) => {
    const n = Number(text)
    return text.trim() === '' || !Number.isFinite(n) || n < 0 ? fallback : n
  }
  const sizeG = parsed(sizeText, 0)
  const remainingG = parsed(leftText, 0)

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold">{bean.name ? 'Edit bag' : 'Add a bag'}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        Only the name is required. Everything else sharpens the recipes the app builds for you.
      </p>

      <div className="mt-6 space-y-4">
        <TextField
          label="Name"
          value={draft.name}
          onChange={(v) => set('name', v)}
          placeholder="Nyeri AA"
        />
        <TextField
          label="Roaster"
          value={draft.roaster}
          onChange={(v) => set('roaster', v)}
          placeholder="Who roasted it"
        />

        <label className="block">
          <span className="text-sm">Roast date</span>
          <input
            type="date"
            value={draft.roastDate ? draft.roastDate.slice(0, 10) : ''}
            onChange={(e) =>
              set('roastDate', e.target.value ? new Date(e.target.value).toISOString() : undefined)
            }
            className="mt-1 w-full rounded-lg bg-[var(--color-surface)] px-3"
          />
          <span className="mt-1 block text-xs text-[var(--color-faint)]">
            Roasted-on, not best-before. This drives the whole freshness model.
          </span>
        </label>

        <fieldset>
          <legend className="text-sm">Roast level</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {ROAST_LEVELS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => set('roastLevel', draft.roastLevel === r.id ? undefined : r.id)}
                className={`compact rounded-full px-4 text-sm transition-all duration-200 ${
                  draft.roastLevel === r.id
                    ? 'bg-[var(--color-accent)] font-semibold text-[var(--color-on-accent)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-ink)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Bag size"
            unit="g"
            value={sizeText}
            placeholder="250"
            onChange={(v) => {
              // A fresh bag is full, so keep "left" in step while they match.
              if (leftText === sizeText) setLeftText(v)
              setSizeText(v)
            }}
          />
          <NumberField label="Left" unit="g" value={leftText} onChange={setLeftText} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Country"
            value={draft.country ?? ''}
            onChange={(v) => set('country', v || undefined)}
          />
          <TextField
            label="Region"
            value={draft.region ?? ''}
            onChange={(v) => set('region', v || undefined)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Variety"
            value={draft.variety ?? ''}
            onChange={(v) => set('variety', v || undefined)}
          />
          <TextField
            label="Process"
            value={draft.process ?? ''}
            onChange={(v) => set('process', v || undefined)}
          />
        </div>

        <label className="block">
          <span className="text-sm">Altitude</span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={altitudeText}
              onChange={(e) => setAltitudeText(e.target.value)}
              placeholder="1800"
              className="mt-1 w-full rounded-lg bg-[var(--color-surface)] px-3 tabular-nums"
            />
            <span className="mt-1 text-sm text-[var(--color-muted)]">masl</span>
          </span>
          <span className="mt-1 block text-xs text-[var(--color-faint)]">
            Higher-grown beans are denser, so the generator grinds finer and brews hotter.
          </span>
        </label>

        <label className="block">
          <span className="text-sm">Roaster tasting notes</span>
          <textarea
            value={draft.roasterNotes ?? ''}
            onChange={(e) => set('roasterNotes', e.target.value || undefined)}
            rows={2}
            placeholder="Blackcurrant, tomato leaf, brown sugar"
            className="mt-1 w-full rounded-lg bg-[var(--color-surface)] p-3 text-sm"
          />
        </label>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() =>
            onSave({
              ...draft,
              sizeG,
              // Cannot have more left than the bag holds.
              remainingG: Math.min(remainingG, sizeG),
              ...(altitudeText.trim() === ''
                ? { altitudeMasl: undefined }
                : { altitudeMasl: parsed(altitudeText, 0) }),
              updatedAt: Date.now(),
            })
          }
          disabled={draft.name.trim() === ''}
          className="flex-1 rounded-lg bg-[var(--color-accent)] py-4 font-semibold text-[var(--color-on-accent)] disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-6 bg-[var(--color-raised)] font-semibold transition-all duration-200 hover:bg-[var(--color-line)]"
        >
          Cancel
        </button>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="mt-3 w-full rounded-lg py-3 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] bg-[var(--color-raised)] font-semibold transition-all duration-200 hover:bg-[var(--color-line)]"
        >
          Delete this bag
        </button>
      )}
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <PageHeader title="Shelf" />
      <PageBody>{children}</PageBody>
    </main>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div className="rounded-lg bg-[var(--color-surface)] px-3 py-3">
      <p className="text-[10px] uppercase tracking-widest text-[var(--color-faint)]">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold tabular-nums ${
          tone === 'warn' ? 'text-[var(--color-warn)]' : ''
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-[var(--color-faint)]">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-sm">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg bg-[var(--color-surface)] px-3"
      />
    </label>
  )
}

/**
 * Numeric field holding a raw string.
 *
 * A controlled `<input type="number">` fed a number is a trap: React skips the
 * DOM write when `Number(node.value) === Number(props.value)`, so a stray
 * leading zero ("0150") stays on screen forever even though the state is 150.
 * Keeping the string means what you see is exactly what is stored.
 */
function NumberField({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-sm">
        {label} <span className="text-[var(--color-faint)]">({unit})</span>
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        // Tidy up a typed leading zero once the field is left alone.
        onBlur={() => {
          const n = Number(value)
          if (value.trim() !== '' && Number.isFinite(n) && String(n) !== value) onChange(String(n))
        }}
        className="mt-1 w-full rounded-lg bg-[var(--color-surface)] px-3 tabular-nums"
      />
    </label>
  )
}
