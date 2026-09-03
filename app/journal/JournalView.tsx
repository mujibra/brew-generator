'use client'

import { PageBody, PageHeader } from '@/app/components/ui'

import { Select } from '@/app/components/Select'
import { formatElapsed } from '@/lib/brew/timer'
import { repository } from '@/lib/db/dexie'
import type { BeanRecord, BrewRecord } from '@/lib/db/repository'
import { exportFilename, toCsv, toJson } from '@/lib/journal/export'
import {
  type Filters,
  byGrind,
  byRecipe,
  chartPoints,
  describeZone,
  filterBrews,
  sortByNewest,
  summarise,
} from '@/lib/journal/stats'
import { RECIPES } from '@/lib/recipes/builtin'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ControlChart } from './ControlChart'
import { ShareSheet } from './ShareSheet'

const RECIPE_NAMES = new Map<string, string>([
  ...RECIPES.map((r) => [r.id, r.name] as [string, string]),
  ['generated', 'Built recipe'],
  ['ad-hoc', 'No recipe'],
])

const recipeName = (id?: string) => RECIPE_NAMES.get(id ?? 'ad-hoc') ?? id ?? 'No recipe'

const TAGS = ['sour', 'bitter', 'thin', 'muddy', 'sweet', 'clean', 'balanced', 'astringent', 'flat']

export function JournalView() {
  const [brews, setBrews] = useState<BrewRecord[] | null>(null)
  const [beans, setBeans] = useState<BeanRecord[]>([])
  const [grinderId, setGrinderId] = useState<string | undefined>()
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    repository()
      .brews.all()
      .then((rows) => setBrews(sortByNewest(rows)))
      .catch((e) => {
        setError((e as Error).message)
        setBrews([])
      })
    // The bag and the grinder are only needed for the caption, so a failure
    // here degrades the caption rather than breaking the journal.
    repository()
      .beans.all()
      .then(setBeans)
      .catch(() => setBeans([]))
    repository()
      .settings.get('gear')
      .then((g) => setGrinderId(g?.grinderId))
      .catch(() => setGrinderId(undefined))
  }, [])

  const stats = useMemo(() => summarise(brews ?? [], Date.now()), [brews])
  const visible = useMemo(() => filterBrews(brews ?? [], filters), [brews, filters])
  const points = useMemo(() => chartPoints(visible), [visible])
  const recipes = useMemo(() => byRecipe(brews ?? []), [brews])
  // Grind only compares meaningfully within one recipe, so this appears once a
  // recipe filter is on and there is more than one setting to compare.
  const grinds = useMemo(
    () => (filters.recipeId ? byGrind(visible) : []),
    [filters.recipeId, visible],
  )
  const selected = visible.find((b) => b.id === selectedId)

  async function update(id: string, patch: Partial<BrewRecord>) {
    const current = (brews ?? []).find((b) => b.id === id)
    if (!current) return
    const next = { ...current, ...patch }
    await repository().brews.put(next)
    setBrews((prev) => (prev ? sortByNewest(prev.map((b) => (b.id === id ? next : b))) : prev))
  }

  async function remove(id: string) {
    await repository().brews.delete(id)
    setBrews((prev) => (prev ? prev.filter((b) => b.id !== id) : prev))
    setSelectedId(null)
  }

  function download(kind: 'csv' | 'json') {
    const data = kind === 'csv' ? toCsv(brews ?? []) : toJson(brews ?? [])
    const blob = new Blob([data], {
      type: kind === 'csv' ? 'text/csv;charset=utf-8' : 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportFilename(kind, Date.now())
    a.click()
    URL.revokeObjectURL(url)
  }

  if (brews === null) {
    return (
      <Shell>
        <p className="mt-10 text-[var(--color-muted)]">Loading…</p>
      </Shell>
    )
  }

  if (brews.length === 0) {
    return (
      <Shell>
        <div className="mt-12 rounded-lg bg-[var(--color-surface)] p-6 text-center">
          <h2 className="text-xl font-semibold">Nothing logged yet</h2>
          <p className="mt-2 text-[var(--color-muted)]">
            Finish a brew and it lands here. Add a TDS reading and it lands on the chart too.
          </p>
          <Link
            href="/brew/"
            className="tap mt-6 inline-block rounded-lg bg-[var(--color-accent)] px-6 py-3 font-semibold text-[var(--color-on-accent)]"
          >
            Brew something
          </Link>
          {error && <p className="mt-4 text-sm text-[var(--color-warn)]">{error}</p>}
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {/* --- Totals */}
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Brews" value={String(stats.total)} />
        <Stat
          label="Average score"
          value={stats.avgScore ? stats.avgScore.toFixed(1) : '—'}
          sub={`${stats.scored} scored`}
          tone="good"
        />
        <Stat
          label="Streak"
          value={`${stats.currentStreakDays}d`}
          sub={`best ${stats.longestStreakDays}d`}
          tone="warn"
        />
        <Stat
          label="Coffee used"
          value={`${(stats.totalCoffeeG / 1000).toFixed(2)} kg`}
          sub={`${(stats.totalWaterG / 1000).toFixed(1)} L water`}
          tone="accent"
        />
      </div>

      {/* --- Control chart */}
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
          Brew control chart · {points.length} of {visible.length} measured
        </h2>
        <div className="rounded-lg bg-[var(--color-surface)] p-4">
          {points.length === 0 ? (
            <p className="text-[var(--color-muted)]">
              No brews with a TDS reading yet. Enter one when you log a brew and it appears here,
              with its extraction yield worked out for you.
            </p>
          ) : (
            <ControlChart
              points={points}
              selectedId={selectedId ?? undefined}
              onSelect={setSelectedId}
            />
          )}
        </div>
      </section>

      {/* --- Which recipes work */}
      {recipes.length > 1 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
            How your recipes score
          </h2>
          <ul className="space-y-2">
            {recipes.map((r) => (
              <li
                key={r.recipeId}
                className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface)] px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{recipeName(r.recipeId)}</span>
                  <span className="block text-sm text-[var(--color-faint)]">
                    {r.count} brew{r.count === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="block text-lg font-semibold">
                    {r.avgScore ? r.avgScore.toFixed(1) : '—'}
                  </span>
                  <span className="block text-xs text-[var(--color-faint)]">avg</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- Which grind setting actually works. PRD F3 R5. */}
      {grinds.length > 1 && (
        <section className="mt-8">
          <h2 className="mb-1 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
            How your grind settings score
          </h2>
          <p className="mb-3 text-sm text-[var(--color-faint)]">
            Within {recipeName(filters.recipeId)} only — grind numbers do not compare across
            brewers.
          </p>
          <ul className="space-y-2">
            {grinds.map((g) => (
              <li
                key={g.setting}
                className="flex items-center justify-between gap-3 rounded-lg bg-[var(--color-surface)] px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block font-medium tabular-nums">{g.setting}</span>
                  <span className="block text-sm text-[var(--color-faint)]">
                    {g.count} brew{g.count === 1 ? '' : 's'}
                    {g.avgEyPct !== undefined && ` · ${g.avgEyPct.toFixed(1)} % EY`}
                  </span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="block text-lg font-semibold">
                    {g.avgScore ? g.avgScore.toFixed(1) : '—'}
                  </span>
                  <span className="block text-xs text-[var(--color-faint)]">avg</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- Filters */}
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
          {visible.length === brews.length
            ? `All ${brews.length} brews`
            : `${visible.length} of ${brews.length} brews`}
        </h2>

        <input
          type="search"
          value={filters.text ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, text: e.target.value }))}
          placeholder="Search notes, tags, recipe"
          aria-label="Search brews"
          className="w-full rounded-lg bg-[var(--color-surface)] px-4"
        />

        <div className="mt-2 flex flex-wrap gap-2">
          <Select
            label="Filter by recipe"
            compact
            className="min-w-44"
            value={filters.recipeId ?? ''}
            onChange={(v) => setFilters((f) => ({ ...f, recipeId: v || undefined }))}
            options={[
              { value: '', label: 'Any recipe' },
              ...recipes.map((r) => ({
                value: r.recipeId,
                label: recipeName(r.recipeId),
                hint: `${r.count} brew${r.count === 1 ? '' : 's'}`,
              })),
            ]}
          />

          <FilterPill
            active={filters.minScore === 7}
            onClick={() =>
              setFilters((f) => ({ ...f, minScore: f.minScore === 7 ? undefined : 7 }))
            }
          >
            Scored 7+
          </FilterPill>
          <FilterPill
            active={!!filters.measuredOnly}
            onClick={() => setFilters((f) => ({ ...f, measuredOnly: !f.measuredOnly }))}
          >
            Has TDS
          </FilterPill>
          {(filters.text || filters.recipeId || filters.minScore || filters.measuredOnly) && (
            <FilterPill active={false} onClick={() => setFilters({})}>
              Clear
            </FilterPill>
          )}
        </div>
      </section>

      {/* --- The log */}
      <ul className="mt-4 space-y-2">
        {visible.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => setSelectedId(selectedId === b.id ? null : b.id)}
              aria-expanded={selectedId === b.id}
              className={`w-full rounded-lg border-l-4 px-4 py-3 text-left transition-all duration-200 ${
                selectedId === b.id
                  ? 'border-[var(--color-accent)] bg-[var(--color-raised)]'
                  : 'border-transparent bg-[var(--color-surface)] hover:bg-[var(--color-raised)]'
              }`}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {recipeName(b.recipeId)}
                    {b.iced && (
                      <span className="ml-2 rounded-full bg-[var(--color-raised)] px-2 py-0.5 text-xs font-normal text-[var(--color-muted)]">
                        iced
                      </span>
                    )}
                  </span>
                  {(b.brewerName || b.goal) && (
                    <span className="block truncate text-sm text-[var(--color-muted)]">
                      {[b.brewerName, b.goal && `for ${b.goal}`].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  <span className="block text-sm text-[var(--color-faint)] tabular-nums">
                    {new Date(b.startedAt).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {' · '}
                    {b.doseG}:{b.waterG}
                    {' · '}
                    {formatElapsed(b.totalTimeS * 1000)}
                    {b.grindSetting && ` · grind ${b.grindSetting}`}
                    {b.eyPct !== undefined && ` · ${b.eyPct.toFixed(1)} % EY`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-lg font-semibold tabular-nums">{b.score ?? '—'}</span>
                </span>
              </span>
              {(b.tags?.length ?? 0) > 0 && (
                <span className="mt-2 flex flex-wrap gap-1">
                  {b.tags?.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-[var(--color-raised)] px-2 py-0.5 text-xs text-[var(--color-muted)]"
                    >
                      {t}
                    </span>
                  ))}
                </span>
              )}
            </button>

            {selected?.id === b.id && (
              <Detail
                brew={selected}
                bean={beans.find((x) => x.id === selected.beanId)}
                allBrews={brews ?? []}
                grinderId={grinderId}
                onChange={update}
                onDelete={remove}
              />
            )}
          </li>
        ))}
      </ul>

      {/* --- Export: PRD F3 R9, always available */}
      <section className="mt-10 rounded-lg bg-[var(--color-surface)] p-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
          Your data
        </h2>
        <p className="mt-2 text-sm text-[var(--color-faint)]">
          {stats.total} brews, stored only in this browser. Export them whenever you like — no
          account, no lock-in.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => download('csv')}
            className="compact flex-1 rounded-lg px-4 text-sm bg-[var(--color-raised)] font-semibold transition-all duration-200 hover:bg-[var(--color-line)]"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => download('json')}
            className="compact flex-1 rounded-lg px-4 text-sm bg-[var(--color-raised)] font-semibold transition-all duration-200 hover:bg-[var(--color-line)]"
          >
            Export JSON
          </button>
        </div>
      </section>
    </Shell>
  )
}

function Detail({
  brew,
  bean,
  allBrews,
  grinderId,
  onChange,
  onDelete,
}: {
  brew: BrewRecord
  bean?: BeanRecord
  allBrews: BrewRecord[]
  grinderId?: string
  onChange: (id: string, patch: Partial<BrewRecord>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const point = chartPoints([brew])[0]

  return (
    <div className="mt-2 rounded-lg bg-[var(--color-surface)] p-4">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Fact label="Dose" value={`${brew.doseG} g`} />
        <Fact label="Water" value={`${brew.waterG} g`} />
        <Fact label="Ratio" value={`1:${(brew.waterG / brew.doseG).toFixed(1)}`} />
        <Fact label="Time" value={formatElapsed(brew.totalTimeS * 1000)} />
        {brew.waterTempC !== undefined && <Fact label="Temp" value={`${brew.waterTempC} °C`} />}
        {brew.grindSetting && <Fact label="Grind" value={brew.grindSetting} />}
        {brew.brewerName && <Fact label="Dripper" value={brew.brewerName} />}
        {brew.goal && <Fact label="Aimed at" value={brew.goal} />}
        {brew.iced && <Fact label="Style" value="Japanese iced" />}
        {brew.iceG !== undefined && <Fact label="Ice" value={`${brew.iceG} g`} />}
        {brew.tdsPct !== undefined && <Fact label="TDS" value={`${brew.tdsPct} %`} />}
        {brew.eyPct !== undefined && <Fact label="Yield" value={`${brew.eyPct.toFixed(1)} %`} />}
        {brew.beverageG !== undefined && <Fact label="In the cup" value={`${brew.beverageG} g`} />}
      </dl>

      {point && (
        <p className="mt-3 rounded-lg bg-[var(--color-raised)] px-3 py-2 text-sm">
          {describeZone(point.zone)}
        </p>
      )}

      {/* PRD F3 R3: a log entry is never immutable to its owner. */}
      <label className="mt-4 block">
        <span className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
          Score · {brew.score ?? '—'}
        </span>
        <input
          type="range"
          min={1}
          max={10}
          value={brew.score ?? 6}
          onChange={(e) => onChange(brew.id, { score: Number(e.target.value) })}
          className="mt-2 w-full"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {TAGS.map((t) => {
          const on = brew.tags?.includes(t) ?? false
          return (
            <button
              key={t}
              type="button"
              onClick={() =>
                onChange(brew.id, {
                  tags: on ? (brew.tags ?? []).filter((x) => x !== t) : [...(brew.tags ?? []), t],
                })
              }
              className={`compact rounded-full px-3 text-sm transition-all duration-200 ${
                on
                  ? 'bg-[var(--color-accent)] font-semibold text-[var(--color-on-accent)]'
                  : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-ink)]'
              }`}
            >
              {t}
            </button>
          )
        })}
      </div>

      <label className="mt-4 block">
        <span className="text-xs uppercase tracking-widest text-[var(--color-muted)]">Notes</span>
        <textarea
          value={brew.notes ?? ''}
          onChange={(e) => onChange(brew.id, { notes: e.target.value })}
          rows={2}
          className="mt-2 w-full p-3 text-sm rounded-lg bg-[var(--color-raised)] outline-none transition-colors duration-200 focus:bg-[var(--color-bg)] focus:ring-2 focus:ring-[var(--color-accent)]"
        />
      </label>

      <ShareSheet
        brew={brew}
        bean={bean}
        allBrews={allBrews}
        recipeName={recipeName(brew.recipeId)}
        grinderId={grinderId}
      />

      <div className="mt-4 flex gap-2">
        <Link
          href={`/dial-in/?brew=${brew.id}`}
          className="tap compact flex-1 rounded-lg px-4 text-center text-sm leading-10 bg-[var(--color-raised)] font-semibold transition-all duration-200 hover:bg-[var(--color-line)]"
        >
          Dial this in
        </Link>
        {confirming ? (
          <>
            <button
              type="button"
              onClick={() => onDelete(brew.id)}
              className="compact flex-1 rounded-lg bg-[var(--color-danger)] px-4 text-sm font-medium text-[var(--color-on-accent)]"
            >
              Delete for good
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="compact rounded-lg px-4 text-sm bg-[var(--color-raised)] font-semibold transition-all duration-200 hover:bg-[var(--color-line)]"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="compact rounded-lg px-4 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] bg-[var(--color-raised)] font-semibold transition-all duration-200 hover:bg-[var(--color-line)]"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main>
      <PageHeader title="Journal" />
      <PageBody>{children}</PageBody>
    </main>
  )
}

/**
 * Each stat takes its own colour. Four identical brown tiles read as one block
 * of noise; four colours make the row scannable without a single line or edge.
 */
function Stat({
  label,
  value,
  sub,
  tone = 'ink',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'ink' | 'accent' | 'good' | 'warn'
}) {
  const colour = {
    ink: 'text-[var(--color-ink)]',
    accent: 'text-[var(--color-accent)]',
    good: 'text-[var(--color-good-ink)]',
    warn: 'text-[var(--color-warn)]',
  }[tone]
  return (
    <div className="rounded-lg bg-[var(--color-surface)] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums leading-none ${colour}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--color-faint)]">{sub}</p>}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-[var(--color-faint)]">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`compact rounded-full px-4 text-sm transition-all duration-200 ${
        active
          ? 'bg-[var(--color-accent)] font-semibold text-[var(--color-on-accent)]'
          : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-raised)] hover:text-[var(--color-ink)]'
      }`}
    >
      {children}
    </button>
  )
}
