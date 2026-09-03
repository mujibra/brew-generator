/**
 * Social captions from a logged brew.
 *
 * A brew record already contains everything a good post needs — the numbers,
 * the bean, the process, what it tasted like — and typing it out again by hand
 * is how people end up posting "morning brew ☕" under a photo of a genuinely
 * interesting cup.
 *
 * Three rules shaped this:
 *
 * 1. **The hook is chosen, not templated.** The first line is the only line
 *    most people read, and Instagram truncates it at roughly 125 characters. So
 *    the generator ranks what is actually distinctive about the brew — a
 *    personal best, an experimental ferment, a yield inside the Golden Cup box,
 *    a flash brew — and leads with that instead of always opening the same way.
 *
 * 2. **Never invent.** Every number and every claim comes from the record. If
 *    there is no TDS reading there is no extraction line; if the user wrote no
 *    note, none is quoted. A caption generator that embellishes is a caption
 *    generator you have to proofread, which defeats the point.
 *
 * 3. **Platforms differ in kind, not just in length.** YouTube needs a title
 *    and puts hashtags to work as metadata; Instagram hides everything past the
 *    fold and tolerates thirty tags; TikTok's own guidance is 3-5 tags however
 *    many it allows. Each gets a shape, not the same text truncated.
 *
 * ponytail: pure functions over a plain record, no template engine, no AI call.
 * The interesting part is the ranking, and that is twenty lines.
 */

import { GOLDEN_CUP } from '@/lib/calc/extraction'
import type { BrewRecord } from '@/lib/db/repository'

export type Platform = 'instagram' | 'tiktok' | 'youtube'

/**
 * Limits as published for 2026. `visible` is where the platform truncates in
 * the feed, which matters far more than the hard cap: a caption is only as good
 * as its first `visible` characters.
 */
export const PLATFORMS: Record<
  Platform,
  {
    id: Platform
    label: string
    /** For a three-up tab row, where the full name wraps. */
    shortLabel: string
    limit: number
    visible: number
    /** Hard cap the platform enforces or silently ignores past. */
    maxHashtags: number
    /** What the platform's own guidance recommends, where it differs. */
    idealHashtags: number
    hasTitle: boolean
    titleLimit?: number
    note: string
  }
> = {
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    shortLabel: 'Instagram',
    limit: 2200,
    visible: 125,
    maxHashtags: 30,
    idealHashtags: 12,
    hasTitle: false,
    note: 'Only the first ~125 characters show before "more", so the hook has to land there. Reels and feed share the same limit.',
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    shortLabel: 'TikTok',
    limit: 4000,
    visible: 100,
    maxHashtags: 30,
    // TikTok allows 30 and recommends 3-5. The recommendation wins.
    idealHashtags: 5,
    hasTitle: false,
    note: 'Caption space is generous now, but TikTok recommends 3-5 focused hashtags over a wall of them, so this uses the top few.',
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube Shorts',
    shortLabel: 'Shorts',
    limit: 5000,
    visible: 100,
    // Past 15 YouTube ignores them entirely.
    maxHashtags: 15,
    idealHashtags: 8,
    hasTitle: true,
    titleLimit: 100,
    note: 'Title caps at 100 characters and about 50 show in the feed. Past 15 hashtags YouTube ignores all of them, and #Shorts belongs in the description.',
  },
}

export type CaptionInput = {
  brew: BrewRecord
  /** From the linked bag, when there is one. */
  bean?: {
    name?: string
    roaster?: string
    country?: string
    process?: string
    processLabel?: string
    varietyText?: string
  }
  /** Resolved recipe name, which the record may not carry. */
  recipeName?: string
  grinderName?: string
  /**
   * The pour schedule. Comes off the brew record when it was logged after the
   * record started storing one, and is otherwise derived from the built-in
   * recipe by the caller — a generated recipe brewed before that has none, and
   * the caption simply omits the block rather than guessing at it.
   */
  pours?: { atS: number; toG: number; label: string }[]
}

export type GeneratedCaption = {
  platform: Platform
  /** YouTube only. */
  title?: string
  /** The caption body, hashtags excluded. */
  body: string
  hashtags: string[]
  /** Body plus hashtags, ready to paste. */
  text: string
  chars: number
  limit: number
  /** True when the hook survives the platform's fold. */
  hookFits: boolean
  warnings: string[]
}

const ratio = (b: BrewRecord) => (b.doseG > 0 ? b.waterG / b.doseG : 0)

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`

/** Title case for a tag fragment: "Hario V60" -> "HarioV60". */
const tagCase = (s: string) =>
  s
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w === w.toUpperCase() ? w : w[0]!.toUpperCase() + w.slice(1)))
    .join('')

// --- The hook ---------------------------------------------------------------

/**
 * Candidate opening lines, most distinctive first. The first one whose data
 * exists wins, so a brew with nothing special still gets an honest opener
 * rather than a fabricated superlative.
 */
function hook(input: CaptionInput, personalBest: boolean): string {
  const { brew, bean } = input
  const bag = bean?.name ?? input.recipeName ?? 'this one'
  const r = ratio(brew)
  const rStr = r > 0 ? `1:${r.toFixed(1).replace(/\.0$/, '')}` : ''

  if (personalBest && brew.score !== undefined) {
    return `Best cup I have pulled off this bag — ${brew.score}/10.`
  }
  if (brew.iced) {
    return 'Flash brewed straight onto ice. Full strength, none of the dilution.'
  }
  if (
    bean?.processLabel &&
    /ferment|anaerobic|carbonic|lactic|thermal|koji|honey/i.test(bean.processLabel)
  ) {
    return `${bean.processLabel} takes a cooler, coarser brew than it looks like it should.`
  }
  if (
    brew.eyPct !== undefined &&
    brew.eyPct >= GOLDEN_CUP.ey.min &&
    brew.eyPct <= GOLDEN_CUP.ey.max
  ) {
    return `${brew.eyPct.toFixed(1)} % extraction, ${brew.tdsPct ?? '—'} % strength — inside the Golden Cup box.`
  }
  if (brew.score !== undefined && brew.score >= 8) {
    return `${brew.score}/10. ${bag} finally doing what the bag promised.`
  }
  if (brew.daysOffRoast !== undefined && brew.daysOffRoast <= 7) {
    return `${brew.daysOffRoast} days off roast and still gassing. ${rStr} anyway.`
  }
  if (rStr && brew.brewerName) {
    return `${bag} on the ${brew.brewerName}, ${rStr}.`
  }
  return `${bag}, logged.`
}

// --- Hashtags ---------------------------------------------------------------

/**
 * Ranked most-specific-first, because every platform truncates the list
 * somewhere and the specific tags are the ones that find an audience. Generic
 * coffee tags are last: they are the most competitive and the least useful.
 */
export function buildHashtags(input: CaptionInput, platform: Platform): string[] {
  const { brew, bean } = input
  const out: string[] = []
  const add = (...tags: string[]) => {
    for (const t of tags) {
      const clean = t.replace(/^#/, '')
      if (clean && !out.some((x) => x.toLowerCase() === clean.toLowerCase())) out.push(clean)
    }
  }

  // YouTube reads the first tags as the ones shown above the title, and
  // #Shorts is what routes a video into the Shorts feed at all.
  if (platform === 'youtube') add('Shorts')

  // Most specific: this exact brew.
  if (brew.iced) add('JapaneseIcedCoffee', 'FlashBrew')
  if (bean?.processLabel) {
    const p = bean.processLabel
    if (/anaerobic/i.test(p)) add('AnaerobicCoffee')
    if (/carbonic/i.test(p)) add('CarbonicMaceration')
    if (/lactic/i.test(p)) add('LacticFermentation')
    if (/thermal/i.test(p)) add('ThermalShock')
    if (/koji/i.test(p)) add('KojiCoffee')
    if (/honey/i.test(p)) add('HoneyProcess')
    if (/natural/i.test(p)) add('NaturalProcess')
    if (/washed/i.test(p)) add('WashedProcess')
    if (/wet-?hull|giling/i.test(p)) add('WetHulled')
    if (/monsoon/i.test(p)) add('MonsoonedMalabar')
  }
  if (bean?.country) add(tagCase(bean.country), `${tagCase(bean.country)}Coffee`)
  if (bean?.roaster) add(tagCase(bean.roaster))
  if (brew.brewerName) add(tagCase(brew.brewerName))
  if (input.grinderName) add(tagCase(input.grinderName))

  // Method and craft.
  if (input.recipeName) {
    const n = input.recipeName
    if (/4:6|kasuya/i.test(n)) add('FourSixMethod', 'TetsuKasuya')
    if (/hoffmann/i.test(n)) add('JamesHoffmann')
  }
  if (brew.tdsPct !== undefined || brew.eyPct !== undefined) add('ExtractionYield', 'CoffeeScience')
  if (brew.goal) add(`Brew${tagCase(brew.goal)}`)

  // Evergreen, in descending order of usefulness.
  add(
    'PourOver',
    'SpecialtyCoffee',
    'ManualBrew',
    'ThirdWaveCoffee',
    'CoffeeAtHome',
    'BrewGuide',
    'HomeBarista',
    'CoffeeLover',
    'Coffee',
  )

  const spec = PLATFORMS[platform]
  return out.slice(0, Math.min(spec.idealHashtags, spec.maxHashtags))
}

// --- Body -------------------------------------------------------------------

function recipeLines(input: CaptionInput): string[] {
  const { brew, bean } = input
  const lines: string[] = []
  const r = ratio(brew)

  const bagLine = [bean?.roaster, bean?.name].filter(Boolean).join(' · ')
  if (bagLine) {
    lines.push(
      `☕ ${bagLine}${bean?.country ? ` — ${bean.country}` : ''}${
        bean?.processLabel ? `, ${bean.processLabel}` : ''
      }`,
    )
  }

  const gear = [brew.brewerName, input.grinderName].filter(Boolean).join(' + ')
  if (gear) lines.push(`⚙️ ${gear}`)

  const recipe = [
    `${brew.doseG} g`,
    `${brew.waterG} g`,
    r > 0 ? `1:${r.toFixed(1).replace(/\.0$/, '')}` : '',
    brew.waterTempC !== undefined ? `${brew.waterTempC} °C` : '',
    brew.grindSetting ? `grind ${brew.grindSetting}` : '',
    brew.totalTimeS ? mmss(brew.totalTimeS) : '',
  ].filter(Boolean)
  lines.push(`📋 ${recipe.join(' · ')}`)

  if (brew.tdsPct !== undefined || brew.eyPct !== undefined) {
    const measured = [
      brew.tdsPct !== undefined ? `${brew.tdsPct} % TDS` : '',
      brew.eyPct !== undefined ? `${brew.eyPct.toFixed(1)} % yield` : '',
    ].filter(Boolean)
    lines.push(`📈 ${measured.join(' · ')}`)
  }

  if (brew.iced && brew.iceG !== undefined) {
    lines.push(`🧊 ${brew.waterG - brew.iceG} g hot onto ${brew.iceG} g ice`)
  }

  // The pour schedule is the part a video is actually of, so it gets its own
  // block rather than being folded into the summary line. Cumulative targets,
  // because that is what the scale reads.
  const pours = input.pours ?? brew.pours
  if (pours && pours.length > 0) {
    lines.push('🫗 Pours')
    for (const p of pours) {
      const isBloom = /bloom/i.test(p.label)
      lines.push(`   ${mmss(p.atS)} → ${p.toG} g${isBloom ? '  (bloom)' : ''}`)
    }
  }

  const taste = [...(brew.tags ?? [])].join(', ')
  if (taste) lines.push(`👅 ${taste}`)
  if (brew.score !== undefined) lines.push(`⭐ ${brew.score}/10`)

  return lines
}

const CTA = 'Full recipe and the reasoning behind every number: mujibra.github.io/brew-generator'

export function generateCaption(
  input: CaptionInput,
  platform: Platform,
  opts: { personalBest?: boolean; includeLink?: boolean } = {},
): GeneratedCaption {
  const spec = PLATFORMS[platform]
  const head = hook(input, Boolean(opts.personalBest))
  const lines = recipeLines(input)
  const note = input.brew.notes?.trim()
  const hashtags = buildHashtags(input, platform)

  const blocks: string[] = [head, lines.join('\n')]
  // The user's own words are the most interesting thing in the post, so they go
  // above the boilerplate rather than below it.
  if (note) blocks.push(`"${note}"`)
  if (opts.includeLink !== false) blocks.push(CTA)

  const body = blocks.join('\n\n')
  const tagLine = hashtags.map((h) => `#${h}`).join(' ')
  const text = `${body}\n\n${tagLine}`

  const warnings: string[] = []
  if (text.length > spec.limit) {
    warnings.push(
      `${text.length} characters is over ${spec.label}'s ${spec.limit}. Trim the note or drop the link.`,
    )
  }
  if (head.length > spec.visible) {
    warnings.push(
      `The opening line is ${head.length} characters and ${spec.label} cuts off around ${spec.visible}, so the end of the hook will be hidden behind "more".`,
    )
  }

  const title =
    platform === 'youtube'
      ? (() => {
          const t = youtubeTitle(input, Boolean(opts.personalBest))
          return t.length > (spec.titleLimit ?? 100)
            ? `${t.slice(0, (spec.titleLimit ?? 100) - 1)}…`
            : t
        })()
      : undefined

  return {
    platform,
    ...(title ? { title } : {}),
    body,
    hashtags,
    text,
    chars: text.length,
    limit: spec.limit,
    hookFits: head.length <= spec.visible,
    warnings,
  }
}

/**
 * A Shorts title is a search query, not a sentence: the useful 50 characters
 * are the concrete nouns and numbers, so it leads with the gear and the recipe
 * rather than with a feeling.
 */
function youtubeTitle(input: CaptionInput, personalBest: boolean): string {
  const { brew, bean } = input
  const r = ratio(brew)
  const rStr = r > 0 ? `1:${r.toFixed(1).replace(/\.0$/, '')}` : ''
  const parts: string[] = []

  if (brew.iced) parts.push('Japanese Iced')
  if (brew.brewerName) parts.push(brew.brewerName)
  if (bean?.country) parts.push(bean.country)
  if (bean?.processLabel) parts.push(bean.processLabel)

  const lead = parts.length > 0 ? parts.join(' ') : (bean?.name ?? 'Pour Over')
  const numbers = [
    brew.doseG && brew.waterG ? `${brew.doseG}:${brew.waterG}` : '',
    rStr,
    brew.waterTempC !== undefined ? `${brew.waterTempC}°C` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const tail = personalBest && brew.score !== undefined ? ` (${brew.score}/10)` : ''
  return `${lead} — ${numbers}${tail}`
}

/**
 * Whether this brew is the best-scored one on its bag. Used for the hook, and
 * it needs the sibling brews rather than just this one.
 */
export function isPersonalBest(brew: BrewRecord, all: BrewRecord[]): boolean {
  if (brew.score === undefined) return false
  const siblings = all.filter(
    (b) => b.score !== undefined && (brew.beanId ? b.beanId === brew.beanId : b.id === brew.id),
  )
  if (siblings.length < 3) return false
  return siblings.every((b) => (b.score ?? 0) <= brew.score!)
}
