/**
 * The flat design system, as components.
 *
 * Before this file the same card was hand-written 32 times and the same
 * uppercase eyebrow 52 times, each a slightly different set of utilities. That
 * is where visual drift comes from, so the rules live here once:
 *
 *   - no shadows, no blur, no gradients on elements: grouping is a block of
 *     solid colour, never a lifted plane
 *   - one radius family, 6px and 8px
 *   - hover is a colour shift and a scale, both 200ms, never a lift
 *   - borders are the exception, and when used they are thick enough to read
 *     as a graphic edge rather than a hairline
 *
 * Everything here is a plain function component over native elements. No
 * variant library: the surface is small and the union types keep it honest.
 */

import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/** Tailwind class merge, minus the dependency: last wins is not needed here. */
export const cx = (...parts: (string | false | undefined | null)[]) =>
  parts.filter(Boolean).join(' ')

// --- Type -------------------------------------------------------------------

/**
 * The uppercase label above a value. Small, wide-tracked, muted — it names the
 * thing without competing with it.
 */
export function Eyebrow({
  children,
  className,
  as: As = 'p',
}: {
  children: ReactNode
  className?: string
  as?: 'p' | 'h2' | 'h3' | 'span' | 'dt'
}) {
  return (
    <As
      className={cx(
        'text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]',
        className,
      )}
    >
      {children}
    </As>
  )
}

/**
 * A section heading with its eyebrow. The number is deliberately large: with no
 * shadows to separate sections, scale is what does it.
 */
export function SectionTitle({
  eyebrow,
  children,
  hint,
  className,
}: {
  eyebrow?: string
  children: ReactNode
  hint?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('mb-4', className)}>
      {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
      <h2 className="text-2xl">{children}</h2>
      {hint && <p className="mt-2 text-sm text-[var(--color-muted)]">{hint}</p>}
    </div>
  )
}

// --- Blocks -----------------------------------------------------------------

type Tone = 'surface' | 'raised' | 'accent' | 'good' | 'warn' | 'bare'

const CARD_TONES: Record<Tone, string> = {
  surface: 'bg-[var(--color-surface)] text-[var(--color-ink)]',
  raised: 'bg-[var(--color-raised)] text-[var(--color-ink)]',
  accent: 'bg-[var(--color-accent)] text-[var(--color-on-accent)]',
  good: 'bg-[var(--color-good)] text-[var(--color-ink)]',
  warn: 'bg-[var(--color-warn-block)] text-[var(--color-warn)]',
  // For the rare block that has to sit on a coloured parent and stay legible.
  bare: 'border-2 border-[var(--color-line-strong)] text-[var(--color-ink)]',
}

/**
 * A colour block. This replaces every `rounded-2xl border ... bg-surface` in
 * the app: the background is what defines the edge, so there is no border and
 * there is certainly no shadow.
 */
export function Card({
  tone = 'surface',
  className,
  children,
  ...rest
}: { tone?: Tone } & ComponentProps<'div'>) {
  return (
    <div className={cx('rounded-lg p-4', CARD_TONES[tone], className)} {...rest}>
      {children}
    </div>
  )
}

/** A card you can press. Scales, intensifies, and keeps its 48px target. */
export function CardLink({
  href,
  tone = 'surface',
  className,
  children,
  ...rest
}: { href: string; tone?: Tone } & Omit<ComponentProps<typeof Link>, 'href'>) {
  return (
    <Link
      href={href}
      className={cx(
        'tap group block rounded-lg p-4 transition-all duration-200',
        'hover:scale-[1.02] hover:bg-[var(--color-raised)]',
        CARD_TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  )
}

// --- Buttons ----------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:bg-[var(--color-accent-strong)]',
  secondary: 'bg-[var(--color-raised)] text-[var(--color-ink)] hover:bg-[var(--color-line)]',
  // Thick border, filled on hover. Four pixels because two reads as a hairline
  // against a dark ground and the whole point is a graphic edge.
  outline:
    'border-4 border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-on-accent)]',
  ghost: 'text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]',
  danger:
    'border-4 border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-bg)]',
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg px-5 font-semibold transition-all duration-200 disabled:opacity-40 disabled:hover:scale-100'

export function Button({
  variant = 'primary',
  full,
  className,
  children,
  ...rest
}: { variant?: ButtonVariant; full?: boolean } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cx(
        BUTTON_BASE,
        'hover:scale-[1.03]',
        BUTTON_VARIANTS[variant],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/** The same shape as a link, because a navigation is not a button. */
export function ButtonLink({
  href,
  variant = 'primary',
  full,
  className,
  children,
  ...rest
}: { href: string; variant?: ButtonVariant; full?: boolean } & Omit<
  ComponentProps<typeof Link>,
  'href'
>) {
  return (
    <Link
      href={href}
      className={cx(
        'tap',
        BUTTON_BASE,
        'py-3 hover:scale-[1.03]',
        BUTTON_VARIANTS[variant],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  )
}

// --- Data -------------------------------------------------------------------

/**
 * A number and what it is. The value is set large and tabular so a column of
 * these lines up; the label sits under it, quiet.
 */
export function Stat({
  label,
  value,
  unit,
  tone,
  className,
}: {
  label: string
  value: ReactNode
  unit?: string
  tone?: 'accent' | 'good' | 'warn'
  className?: string
}) {
  const colour =
    tone === 'accent'
      ? 'text-[var(--color-accent)]'
      : tone === 'good'
        ? 'text-[var(--color-good-ink)]'
        : tone === 'warn'
          ? 'text-[var(--color-warn)]'
          : 'text-[var(--color-ink)]'
  return (
    <div className={className}>
      <Eyebrow className="mb-1">{label}</Eyebrow>
      <p className={cx('text-2xl font-bold tabular-nums leading-none', colour)}>
        {value}
        {unit && (
          <span className="ml-1 text-base font-medium text-[var(--color-faint)]">{unit}</span>
        )}
      </p>
    </div>
  )
}

/** A small state marker. Pill, because a tag is the one place a pill belongs. */
export function Tag({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'danger'
  children: ReactNode
  className?: string
}) {
  const tones = {
    neutral: 'bg-[var(--color-raised)] text-[var(--color-muted)]',
    accent: 'bg-[var(--color-accent)] text-[var(--color-on-accent)]',
    good: 'bg-[var(--color-good)] text-[var(--color-good-ink)]',
    warn: 'bg-[var(--color-warn-block)] text-[var(--color-warn)]',
    danger: 'bg-[var(--color-danger)] text-[var(--color-bg)]',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * Background decoration: a large geometric shape, low opacity, absolutely
 * positioned. Poster furniture. It is what keeps a flat page from reading as an
 * empty one, and it is `aria-hidden` because it says nothing.
 */
export function Decoration({
  className,
  shape = 'circle',
}: {
  className?: string
  shape?: 'circle' | 'square'
}) {
  return (
    <div
      aria-hidden
      className={cx(
        'pointer-events-none absolute',
        shape === 'circle' ? 'rounded-full' : 'rotate-12 rounded-lg',
        className,
      )}
    />
  )
}

// --- Page chrome -------------------------------------------------------------

/**
 * Every surface opens the same way: a full-bleed block of colour carrying the
 * back link, the title and one line of what the screen is for.
 *
 * Full bleed matters. A contained header is a card, and a card reads as one
 * item among many; a block that runs to both edges reads as the top of the
 * page. That is the whole substitution this design makes for depth.
 */
export function PageHeader({
  back = { href: '/', label: 'Extraction' },
  title,
  lead,
  children,
}: {
  back?: { href: string; label: string } | false
  title: ReactNode
  lead?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="relative overflow-hidden bg-[var(--color-surface)]">
      <Decoration
        shape="circle"
        className="-right-20 -top-24 h-64 w-64 bg-[var(--color-accent)] opacity-[0.06]"
      />
      <div className="relative mx-auto max-w-2xl px-5 pb-8 pt-6">
        {back && (
          <Link
            href={back.href}
            className="tap -ml-1 inline-flex items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-[var(--color-muted)] transition-colors duration-200 hover:text-[var(--color-accent)]"
          >
            <span aria-hidden>←</span>
            {back.label}
          </Link>
        )}
        <h1 className="mt-3 text-4xl">{title}</h1>
        {lead && <p className="mt-3 max-w-lg leading-snug text-[var(--color-muted)]">{lead}</p>}
        {children}
      </div>
    </header>
  )
}

/** The body under a PageHeader. Same measure, same gutters, on every screen. */
export function PageBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cx('mx-auto max-w-2xl px-5 py-8', className)}>{children}</div>
}
