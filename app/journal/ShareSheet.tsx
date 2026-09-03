'use client'

/**
 * Caption generator, in the journal — PRD F3.
 *
 * The brew record already holds everything a post needs. This turns it into a
 * caption per platform and gets it onto the clipboard, which is the whole job:
 * the app cannot post for you and should not pretend to.
 *
 * The character counter is not decoration. Instagram hides everything past
 * ~125 characters and YouTube ignores hashtags past fifteen, so a caption that
 * fits the hard limit can still be broken in the feed. The counter shows the
 * fold, not just the cap.
 */

import { Eyebrow } from '@/app/components/ui'
import { compileRecipe, pourSchedule } from '@/lib/brew/steps'
import type { BeanRecord, BrewRecord } from '@/lib/db/repository'
import { grinderById } from '@/lib/grinders/registry'
import { recipeById, toRecipeInput } from '@/lib/recipes/builtin'
import { PROCESS_BY_ID, processFromText, resolveProcessId } from '@/lib/recipes/process'
import { PLATFORMS, type Platform, generateCaption, isPersonalBest } from '@/lib/social/caption'
import { useMemo, useRef, useState } from 'react'

const ORDER: Platform[] = ['instagram', 'tiktok', 'youtube']

export function ShareSheet({
  brew,
  bean,
  allBrews,
  recipeName,
  grinderId,
}: {
  brew: BrewRecord
  bean?: BeanRecord
  allBrews: BrewRecord[]
  recipeName?: string
  grinderId?: string
}) {
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [withLink, setWithLink] = useState(true)
  const [copied, setCopied] = useState<'text' | 'title' | 'tags' | null>(null)
  const [manual, setManual] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const caption = useMemo(() => {
    const processId = bean
      ? (resolveProcessId(bean.processId) ?? processFromText(bean.process))
      : undefined
    // Brews logged before the record stored a schedule can still have one, as
    // long as they were a built-in recipe. A generated recipe from back then is
    // gone, and the caption omits the block rather than inventing a plausible
    // schedule that was never actually poured.
    const builtin = brew.recipeId ? recipeById(brew.recipeId) : undefined
    const pours =
      brew.pours ?? (builtin ? pourSchedule(compileRecipe(toRecipeInput(builtin))) : undefined)

    return generateCaption(
      {
        brew,
        ...(pours && pours.length > 0 ? { pours } : {}),
        ...(bean
          ? {
              bean: {
                ...(bean.name ? { name: bean.name } : {}),
                ...(bean.roaster ? { roaster: bean.roaster } : {}),
                ...(bean.country ? { country: bean.country } : {}),
                ...(bean.process ? { process: bean.process } : {}),
                ...(processId ? { processLabel: PROCESS_BY_ID[processId].label } : {}),
              },
            }
          : {}),
        ...(recipeName ? { recipeName } : {}),
        ...(grinderId && grinderById(grinderId)
          ? { grinderName: grinderById(grinderId)!.name }
          : {}),
      },
      platform,
      { personalBest: isPersonalBest(brew, allBrews), includeLink: withLink },
    )
  }, [brew, bean, allBrews, recipeName, grinderId, platform, withLink])

  const spec = PLATFORMS[platform]

  async function copy(what: 'text' | 'title' | 'tags') {
    const value =
      what === 'title'
        ? (caption.title ?? '')
        : what === 'tags'
          ? caption.hashtags.map((h) => `#${h}`).join(' ')
          : caption.text
    try {
      await navigator.clipboard.writeText(value)
      setCopied(what)
      setManual(false)
      // No timer to clean up: the label resets on the next interaction, and a
      // stray setTimeout on an unmounted panel is a warning nobody needs.
    } catch {
      // The clipboard API is refused in plenty of real situations — an
      // insecure origin, a locked-down in-app browser, a denied permission. A
      // button that does nothing at all is worse than one that hands the job
      // back, so select the text and say so.
      setCopied(null)
      setManual(true)
      const node = bodyRef.current
      if (node) {
        node.focus()
        node.select()
      }
    }
  }

  return (
    <section className="mt-4 rounded-lg bg-[var(--color-raised)] p-4">
      <Eyebrow>Caption</Eyebrow>

      <div role="tablist" aria-label="Platform" className="mt-2 flex gap-1.5">
        {ORDER.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={platform === p}
            onClick={() => {
              setPlatform(p)
              setCopied(null)
            }}
            className={`compact flex-1 rounded-lg px-2 text-sm font-semibold transition-all duration-200 ${
              platform === p
                ? 'bg-[var(--color-accent)] text-[var(--color-on-accent)]'
                : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            {PLATFORMS[p].shortLabel}
          </button>
        ))}
      </div>

      {caption.title !== undefined && (
        <div className="mt-3">
          <Eyebrow className="mb-1">
            Title · {caption.title.length}/{spec.titleLimit}
          </Eyebrow>
          <p className="rounded-lg bg-[var(--color-bg)] p-3 text-sm font-medium">{caption.title}</p>
          <button
            type="button"
            onClick={() => copy('title')}
            className="compact mt-2 rounded-full bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-muted)] transition-all duration-200 hover:bg-[var(--color-line)] hover:text-[var(--color-ink)]"
          >
            {copied === 'title' ? 'Copied' : 'Copy title'}
          </button>
        </div>
      )}

      <textarea
        ref={bodyRef}
        readOnly
        value={caption.text}
        rows={12}
        aria-label={`${spec.label} caption`}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-3 w-full resize-y rounded-lg bg-[var(--color-bg)] p-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {caption.hashtags.map((h) => (
          <span
            key={h}
            className="rounded-full bg-[var(--color-surface)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-accent)]"
          >
            #{h}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-[var(--color-faint)]">
        {caption.chars}/{spec.limit} characters · {caption.hashtags.length}/{spec.maxHashtags}{' '}
        hashtags · the first {spec.visible} characters are what people see before it folds.
      </p>

      {manual && (
        <p className="mt-2 rounded-lg bg-[var(--color-warn-block)] px-3 py-2 text-xs font-medium text-[var(--color-warn)]">
          This browser would not let the page write to the clipboard. The caption above is selected
          — press {navigatorIsApple() ? '⌘' : 'Ctrl'} + C to copy it.
        </p>
      )}

      {caption.warnings.map((w) => (
        <p
          key={w}
          className="mt-2 rounded-lg bg-[var(--color-warn-block)] px-3 py-2 text-xs font-medium text-[var(--color-warn)]"
        >
          {w}
        </p>
      ))}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy('text')}
          className="compact flex-1 rounded-lg bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-on-accent)] transition-all duration-200 hover:bg-[var(--color-accent-strong)]"
        >
          {copied === 'text' ? 'Copied' : 'Copy caption + hashtags'}
        </button>
        <button
          type="button"
          onClick={() => copy('tags')}
          className="compact rounded-lg bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-muted)] transition-all duration-200 hover:bg-[var(--color-line)] hover:text-[var(--color-ink)]"
        >
          {copied === 'tags' ? 'Copied' : 'Tags only'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setWithLink(!withLink)}
        aria-pressed={withLink}
        className="compact mt-2 rounded-full bg-[var(--color-surface)] px-3 text-sm font-semibold text-[var(--color-muted)] transition-all duration-200 hover:text-[var(--color-ink)]"
      >
        {withLink ? 'Link included' : 'No link'}
      </button>

      <p className="mt-3 text-xs leading-relaxed text-[var(--color-faint)]">{spec.note}</p>
    </section>
  )
}

/** Only used to name the right modifier key in the fallback message. */
function navigatorIsApple(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
}
