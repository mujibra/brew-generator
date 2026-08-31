'use client'

import { PageBody, PageHeader } from '@/app/components/ui'

import { CARDS, cardsByCategory, searchCards } from '@/lib/learn/cards'
import { CATEGORY_BLURBS, CATEGORY_LABELS, type CardCategory } from '@/lib/learn/types'
import Link from 'next/link'
import { useMemo, useState } from 'react'

const ORDER: CardCategory[] = ['extraction', 'grind', 'roast', 'water', 'sensory']

export function LearnIndex() {
  const [query, setQuery] = useState('')
  const results = useMemo(() => (query.trim() ? searchCards(query) : null), [query])
  const grouped = useMemo(() => cardsByCategory(), [])

  return (
    <main>
      <PageHeader
        title="Learn"
        lead={`${CARDS.length} cards on why coffee does what it does. Every one ends with what it changes about your brew.`}
      />
      <PageBody>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search — try “flat”, “sour”, “fines”"
          aria-label="Search the knowledge base"
          className="mt-6 w-full rounded-lg bg-[var(--color-surface)] px-4"
        />

        {results ? (
          <section className="mt-6">
            <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
              {results.length} match{results.length === 1 ? '' : 'es'}
            </h2>
            {results.length === 0 ? (
              <p className="text-[var(--color-muted)]">
                Nothing yet. The knowledge base starts with extraction, grind, roast, water and
                tasting — origins and varieties come later.
              </p>
            ) : (
              <ul className="space-y-2">
                {results.map((card) => (
                  <li key={card.id}>
                    <CardLink
                      id={card.id}
                      name={card.name}
                      summary={card.summary}
                      category={card.category}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          ORDER.map((category) => {
            const cards = grouped.get(category) ?? []
            if (cards.length === 0) return null
            return (
              <section key={category} className="mt-8">
                <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
                  {CATEGORY_LABELS[category]}
                </h2>
                <p className="mt-1 mb-3 text-sm text-[var(--color-faint)]">
                  {CATEGORY_BLURBS[category]}
                </p>
                <ul className="space-y-2">
                  {cards.map((card) => (
                    <li key={card.id}>
                      <CardLink id={card.id} name={card.name} summary={card.summary} />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })
        )}

        <p className="mt-10 text-sm text-[var(--color-faint)]">
          This first set covers the mechanisms the dial-in assistant cites. Varieties, processing
          and origins are next.
        </p>
      </PageBody>
    </main>
  )
}

function CardLink({
  id,
  name,
  summary,
  category,
}: {
  id: string
  name: string
  summary: string
  category?: CardCategory
}) {
  return (
    <Link
      href={`/learn/${id}/`}
      className="tap block rounded-lg bg-[var(--color-surface)] px-4 py-3"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{name}</span>
        {category && (
          <span className="shrink-0 text-xs text-[var(--color-faint)]">
            {CATEGORY_LABELS[category]}
          </span>
        )}
      </span>
      <span className="mt-1 block text-sm text-[var(--color-muted)]">{summary}</span>
    </Link>
  )
}
