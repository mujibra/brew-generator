import Link from 'next/link'

const surfaces = [
  { href: '/brew/', name: 'Brew', state: 'working', note: 'Guided step-by-step, five recipes' },
  { href: '/dial-in/', name: 'Dial in', state: 'working', note: 'Diagnose a cup, get one change' },
  {
    href: '/journal/',
    name: 'Journal',
    state: 'working',
    note: 'Every brew, charted and searchable',
  },
  { href: '/shelf/', name: 'Shelf', state: 'working', note: 'Bags, freshness, what is left' },
  {
    href: '/water/',
    name: 'Water',
    state: 'working',
    note: 'Build it, blend it, diagnose your tap',
  },
  { href: '/gear/', name: 'Gear', state: 'working', note: 'Grinder and your own baselines' },
  { href: '/learn/', name: 'Learn', state: 'working', note: 'Why coffee does what it does' },
]

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <header className="mb-10">
        <h1 className="text-4xl font-semibold tracking-tight">Extraction</h1>
        <p className="mt-2 text-[var(--color-muted)]">The brew log that actually knows coffee.</p>
      </header>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-[var(--color-muted)]">
          Surfaces
        </h2>
        <ul className="space-y-2">
          {surfaces.map((s) => {
            const body = (
              <>
                <span className="flex-1">
                  <span className="block font-medium">{s.name}</span>
                  <span className="block text-sm text-[var(--color-muted)]">{s.note}</span>
                </span>
                <span
                  className={
                    s.state === 'working'
                      ? 'self-center text-sm text-[var(--color-accent)]'
                      : 'self-center text-sm text-[var(--color-muted)]'
                  }
                >
                  {s.state === 'working' ? 'ready' : s.state}
                </span>
              </>
            )
            return (
              <li key={s.name}>
                {s.href ? (
                  <Link
                    href={s.href}
                    className="tap flex gap-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex gap-4 rounded-xl border border-[var(--color-line)] px-4 py-3 opacity-60">
                    {body}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <p className="mt-10 text-sm text-[var(--color-muted)]">
        The calculators, dial-in rules, freshness model, water chemistry, and brew timer are built
        and tested. The screens on top of them are next.
      </p>
    </main>
  )
}
