'use client'

import { cardById } from '@/lib/learn/cards'
import { CONFIDENCE_LABELS, type Card, type Depth } from '@/lib/learn/types'
import Link from 'next/link'
import { useState } from 'react'

/**
 * One knowledge card — PRD F11 R3.
 *
 * The depth toggle is the seed of the app-wide depth setting (PRD 13.2): Quick
 * is two sentences and the implication, Standard is the working explanation,
 * Deep is the mechanism and the contested parts.
 */
export function CardView({ card }: { card: Card }) {
  const [depth, setDepth] = useState<Depth>('standard')
  const hasDeep = Boolean(card.body.deep)

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/learn/" className="text-sm text-[var(--color-muted)]">
        ← Learn
      </Link>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{card.name}</h1>
      <p className="mt-3 text-lg text-[var(--color-muted)]">{card.summary}</p>

      {/* The implication leads, because a fact without one is trivia. */}
      <div className="mt-6 rounded-2xl border border-[var(--color-accent)] bg-[var(--color-surface)] p-4">
        <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">
          What this changes
        </p>
        <p className="mt-2">{card.practicalImplication}</p>
      </div>

      <div
        role="tablist"
        aria-label="Reading depth"
        className="mt-8 flex gap-1 rounded-full border border-[var(--color-line)] p-1"
      >
        {(
          [
            ['quick', 'Quick'],
            ['standard', 'Standard'],
            ['deep', 'Deep'],
          ] as [Depth, string][]
        )
          .filter(([id]) => id !== 'deep' || hasDeep)
          .map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={depth === id}
              onClick={() => setDepth(id)}
              className={`compact flex-1 rounded-full text-sm ${
                depth === id
                  ? 'bg-[var(--color-accent)] font-semibold text-[var(--color-on-accent)]'
                  : 'text-[var(--color-muted)]'
              }`}
            >
              {label}
            </button>
          ))}
      </div>

      <Prose text={depth === 'deep' ? (card.body.deep ?? card.body.standard) : card.body[depth]} />

      {card.related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
            Related
          </h2>
          <ul className="space-y-2">
            {card.related.map((id) => {
              const other = cardById(id)
              if (!other) return null
              return (
                <li key={id}>
                  <Link
                    href={`/learn/${id}/`}
                    className="tap block rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3"
                  >
                    <span className="block font-medium">{other.name}</span>
                    <span className="block text-sm text-[var(--color-muted)]">{other.summary}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* PRD F11 R6: sources, confidence, and when this was last looked at. */}
      <footer className="mt-10 rounded-2xl border border-[var(--color-line)] p-4">
        <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">Sources</p>
        <ul className="mt-2 space-y-1 text-sm text-[var(--color-muted)]">
          {card.sources.map((s) => (
            <li key={s.title}>
              {s.title}
              {s.author && <span> — {s.author}</span>}
              {s.year && <span> ({s.year})</span>}
              <span className="text-[var(--color-faint)]"> · {s.kind}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          <span className="text-[var(--color-faint)]">Confidence: </span>
          <span
            className={
              card.confidence === 'established'
                ? 'text-[var(--color-ink)]'
                : 'text-[var(--color-warn)]'
            }
          >
            {CONFIDENCE_LABELS[card.confidence]}
          </span>
          <span className="text-[var(--color-faint)]"> · reviewed {card.lastReviewed}</span>
        </p>
      </footer>
    </main>
  )
}

/**
 * Minimal prose renderer for the card bodies: paragraphs, `-` bullets, and
 * pipe tables.
 *
 * ponytail: the bodies are authored here, so the formatting they use is known
 * and finite. A markdown library would be more code than this and would drag a
 * parser into the bundle for three constructs.
 */
function Prose({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/)

  return (
    <div className="mt-6 space-y-4">
      {blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim())

        if (lines.every((l) => l.startsWith('|'))) {
          return <Table key={i} lines={lines} />
        }

        if (lines.every((l) => l.startsWith('- '))) {
          return (
            <ul key={i} className="ml-1 space-y-2">
              {lines.map((l) => (
                <li key={l} className="flex gap-2">
                  <span className="text-[var(--color-accent)]">·</span>
                  <span>
                    <Inline text={l.slice(2)} />
                  </span>
                </li>
              ))}
            </ul>
          )
        }

        // An indented block is a formula or code sample.
        if (block.startsWith('    ')) {
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-xl bg-[var(--color-raised)] p-4 text-sm"
            >
              <code>{block.replace(/^ {4}/gm, '')}</code>
            </pre>
          )
        }

        return (
          <p key={i} className="leading-relaxed">
            <Inline text={block.replace(/\n/g, ' ')} />
          </p>
        )
      })}
    </div>
  )
}

function Table({ lines }: { lines: string[] }) {
  const rows = lines
    .filter((l) => !/^\|[\s|:-]+\|$/.test(l))
    .map((l) =>
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    )
  const [head, ...body] = rows
  if (!head) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-[var(--color-muted)]">
          <tr className="text-left">
            {head.map((c) => (
              <th key={c} className="py-2 pr-3 font-normal">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row) => (
            <tr key={row.join('|')} className="border-t border-[var(--color-line)]">
              {row.map((c) => (
                <td key={c} className="py-2 pr-3">
                  <Inline text={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Bold only. The bodies use nothing else inline. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}
