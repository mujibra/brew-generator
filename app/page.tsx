import { Decoration, Eyebrow } from '@/app/components/ui'
import {
  Beaker,
  Droplets,
  type LucideIcon,
  NotebookPen,
  Package,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Timer,
} from 'lucide-react'
import Link from 'next/link'

type Surface = {
  href: string
  name: string
  note: string
  icon: LucideIcon
  tone: 'accent' | 'good' | 'warn' | 'surface'
}

/**
 * The first two are the daily loop and are sized to say so. Everything else is
 * equal weight — hierarchy by scale, since there are no shadows to rank with.
 */
const PRIMARY: Surface[] = [
  {
    href: '/brew/',
    name: 'Brew',
    note: 'Guided step by step, live target mass, five recipes',
    icon: Timer,
    tone: 'accent',
  },
  {
    href: '/brew/build/',
    name: 'Build a recipe',
    note: 'Your brewer, your bean, your goal — a full manual with the reasoning attached',
    icon: Sparkles,
    tone: 'good',
  },
]

const REST: Surface[] = [
  {
    href: '/dial-in/',
    name: 'Dial in',
    note: 'Diagnose a cup, get one change',
    icon: SlidersHorizontal,
    tone: 'surface',
  },
  {
    href: '/journal/',
    name: 'Journal',
    note: 'Every brew, charted and searchable',
    icon: NotebookPen,
    tone: 'surface',
  },
  {
    href: '/shelf/',
    name: 'Shelf',
    note: 'Bags, freshness, what is left',
    icon: Package,
    tone: 'surface',
  },
  {
    href: '/water/',
    name: 'Water',
    note: 'Build it, blend it, diagnose your tap',
    icon: Droplets,
    tone: 'surface',
  },
  {
    href: '/gear/',
    name: 'Gear',
    note: 'Grinder and your own baselines',
    icon: Settings2,
    tone: 'surface',
  },
  {
    href: '/learn/',
    name: 'Learn',
    note: '19 cards on why coffee does what it does',
    icon: Beaker,
    tone: 'surface',
  },
]

export default function Home() {
  return (
    <main>
      {/* --- Hero. A colour block, not a page header. */}
      <section className="relative overflow-hidden bg-[var(--color-surface)]">
        <Decoration
          shape="circle"
          className="-right-24 -top-32 h-80 w-80 bg-[var(--color-accent)] opacity-[0.07]"
        />
        <Decoration
          shape="square"
          className="-left-20 -top-10 h-44 w-44 bg-[var(--color-good)] opacity-30"
        />

        <div className="relative mx-auto max-w-2xl px-5 pb-12 pt-16">
          <Eyebrow>Manual brew companion</Eyebrow>
          <h1 className="mt-3 text-6xl">
            Extraction
            <span className="text-[var(--color-accent)]">.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg leading-snug text-[var(--color-muted)]">
            The brew log that actually knows coffee. Every number it gives you comes with the reason
            it gave you that number.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-5 py-10">
        <ul className="grid gap-3 sm:grid-cols-2">
          {PRIMARY.map((s) => (
            <li key={s.href}>
              <BigSurface {...s} />
            </li>
          ))}
        </ul>

        <Eyebrow as="h2" className="mb-3 mt-10">
          Everything else
        </Eyebrow>
        <ul className="grid gap-2 sm:grid-cols-2">
          {REST.map((s) => (
            <li key={s.href}>
              <SmallSurface {...s} />
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm leading-relaxed text-[var(--color-faint)]">
          Everything is stored in your own browser. No account, no server, nothing leaves the
          device. Works offline once installed.
        </p>
      </div>
    </main>
  )
}

function BigSurface({ href, name, note, icon: Icon, tone }: Surface) {
  const block =
    tone === 'accent'
      ? 'bg-[var(--color-accent)] text-[var(--color-on-accent)]'
      : 'bg-[var(--color-good)] text-[var(--color-ink)]'
  return (
    <Link
      href={href}
      className={`tap group flex h-full flex-col gap-4 rounded-lg p-5 transition-transform duration-200 hover:scale-[1.02] ${block}`}
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full ${
          tone === 'accent' ? 'bg-[var(--color-on-accent)]' : 'bg-[var(--color-ink)]'
        }`}
      >
        <Icon
          strokeWidth={2.5}
          className={`h-7 w-7 transition-transform duration-200 group-hover:scale-110 ${
            tone === 'accent' ? 'text-[var(--color-accent)]' : 'text-[var(--color-good)]'
          }`}
        />
      </span>
      <span className="block">
        <span className="block text-2xl font-extrabold tracking-tight">{name}</span>
        <span className="mt-1 block text-sm font-medium leading-snug opacity-80">{note}</span>
      </span>
    </Link>
  )
}

function SmallSurface({ href, name, note, icon: Icon }: Surface) {
  return (
    <Link
      href={href}
      className="tap group flex h-full items-center gap-4 rounded-lg bg-[var(--color-surface)] p-4 transition-all duration-200 hover:scale-[1.02] hover:bg-[var(--color-raised)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-raised)] transition-colors duration-200 group-hover:bg-[var(--color-accent)]">
        <Icon
          strokeWidth={2.5}
          className="h-5 w-5 text-[var(--color-accent)] transition-all duration-200 group-hover:scale-110 group-hover:text-[var(--color-on-accent)]"
        />
      </span>
      <span className="min-w-0">
        <span className="block font-bold tracking-tight">{name}</span>
        <span className="block text-sm leading-snug text-[var(--color-muted)]">{note}</span>
      </span>
    </Link>
  )
}
