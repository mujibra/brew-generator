import type { BrewRecord } from '@/lib/db/repository'
import { describe, expect, it } from 'vitest'
import { PLATFORMS, type Platform, buildHashtags, generateCaption, isPersonalBest } from './caption'

const brew = (over: Partial<BrewRecord> = {}): BrewRecord =>
  ({
    id: 'b1',
    startedAt: 1_760_000_000_000,
    doseG: 20,
    waterG: 320,
    totalTimeS: 195,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  }) as BrewRecord

const ALL: Platform[] = ['instagram', 'tiktok', 'youtube']

describe('every platform gets a usable caption', () => {
  it('stays inside the character limit', () => {
    for (const p of ALL) {
      const c = generateCaption({ brew: brew({ notes: 'x'.repeat(400) }) }, p)
      expect(c.chars, p).toBeLessThanOrEqual(c.limit)
      expect(
        c.warnings.some((w) => /over/.test(w)),
        p,
      ).toBe(false)
    }
  })

  it('respects each platform hashtag count, not one shared number', () => {
    const rich = {
      brew: brew({ iced: true, brewerName: 'Hario V60', goal: 'sweetness', tdsPct: 1.3 }),
      bean: { country: 'Colombia', roaster: 'Onyx', processLabel: 'Anaerobic natural' },
      grinderName: 'Comandante C40',
      recipeName: '4:6 Method',
    }
    for (const p of ALL) {
      expect(buildHashtags({ brew: brew() }, p).length, p).toBeLessThanOrEqual(
        PLATFORMS[p].idealHashtags,
      )
      // A brew with the bean and gear recorded has enough to fill the quota.
      expect(buildHashtags(rich, p).length, p).toBe(PLATFORMS[p].idealHashtags)
      expect(buildHashtags(rich, p).length, p).toBeLessThanOrEqual(PLATFORMS[p].maxHashtags)
    }
    // TikTok's own guidance is 3-5 however many it allows, so it gets fewer
    // than Instagram despite having a larger cap.
    expect(buildHashtags(rich, 'tiktok').length).toBeLessThan(
      buildHashtags(rich, 'instagram').length,
    )
  })

  it('never emits a duplicate or a bare hash', () => {
    for (const p of ALL) {
      const tags = buildHashtags(
        { brew: brew({ iced: true, brewerName: 'Hario V60' }), bean: { country: 'Kenya' } },
        p,
      )
      expect(new Set(tags.map((t) => t.toLowerCase())).size, p).toBe(tags.length)
      for (const t of tags) expect(t, p).not.toMatch(/^#|\s/)
    }
  })

  it('puts hashtags in the text, ready to paste', () => {
    const c = generateCaption({ brew: brew() }, 'instagram')
    expect(c.text).toContain(c.body)
    for (const t of c.hashtags) expect(c.text).toContain(`#${t}`)
  })
})

describe('the hook', () => {
  it('leads with a personal best when there is one', () => {
    const c = generateCaption({ brew: brew({ score: 9 }) }, 'instagram', { personalBest: true })
    expect(c.body.split('\n')[0]).toMatch(/best cup/i)
  })

  it('leads with the method on an iced brew', () => {
    const c = generateCaption({ brew: brew({ iced: true, score: 7 }) }, 'instagram')
    expect(c.body.split('\n')[0]).toMatch(/onto ice/i)
  })

  it('leads with the process when it is an interesting one', () => {
    const c = generateCaption(
      { brew: brew({ score: 7 }), bean: { name: 'Las Flores', processLabel: 'Thermal shock' } },
      'instagram',
    )
    expect(c.body.split('\n')[0]).toMatch(/thermal shock/i)
  })

  it('leads with the numbers when the yield landed in the Golden Cup box', () => {
    const c = generateCaption({ brew: brew({ eyPct: 20.2, tdsPct: 1.31 }) }, 'instagram')
    expect(c.body.split('\n')[0]).toMatch(/golden cup/i)
  })

  it('still opens honestly on an unremarkable brew', () => {
    const c = generateCaption({ brew: brew({ brewerName: 'Kalita Wave' }) }, 'instagram')
    const first = c.body.split('\n')[0]!
    expect(first).toMatch(/kalita wave/i)
    expect(first).not.toMatch(/best|golden cup/i)
  })

  // Instagram hides everything past ~125 characters, so a hook that overruns
  // the fold is a defect the generator should report rather than hide.
  it('reports when the hook will be cut off', () => {
    const c = generateCaption({ brew: brew() }, 'instagram')
    expect(c.hookFits).toBe(true)
    expect(c.body.split('\n')[0]!.length).toBeLessThanOrEqual(PLATFORMS.instagram.visible)
  })
})

describe('it never invents anything', () => {
  it('omits the extraction line when there is no reading', () => {
    const bare = generateCaption({ brew: brew() }, 'instagram')
    expect(bare.body).not.toMatch(/TDS|yield/i)
    const measured = generateCaption({ brew: brew({ tdsPct: 1.28, eyPct: 19.7 }) }, 'instagram')
    expect(measured.body).toMatch(/1\.28 % TDS/)
    expect(measured.body).toMatch(/19\.7 % yield/)
  })

  it('omits the score, tags and note when they are absent', () => {
    const bare = generateCaption({ brew: brew() }, 'instagram')
    expect(bare.body).not.toMatch(/\/10/)
    expect(bare.body).not.toMatch(/"/)
  })

  it('quotes the user note verbatim rather than paraphrasing it', () => {
    const c = generateCaption({ brew: brew({ notes: 'Sweeter on the second half.' }) }, 'tiktok')
    expect(c.body).toContain('"Sweeter on the second half."')
  })

  it('reports only the numbers the record actually holds', () => {
    const c = generateCaption({ brew: brew({ waterTempC: 94, grindSetting: '62' }) }, 'instagram')
    expect(c.body).toMatch(/20 g · 320 g · 1:16 · 94 °C · grind 62 · 3:15/)
  })

  it('gives the ice split, since the whole point is that it is not extra water', () => {
    const c = generateCaption({ brew: brew({ iced: true, iceG: 130 }) }, 'instagram')
    expect(c.body).toMatch(/190 g hot onto 130 g ice/)
  })
})

describe('hashtag ranking', () => {
  it('puts the specific tags before the generic ones', () => {
    const tags = buildHashtags(
      {
        brew: brew({ iced: true, brewerName: 'Hario V60' }),
        bean: { country: 'Kenya', processLabel: 'Anaerobic natural' },
      },
      'tiktok',
    )
    expect(tags[0]).toBe('JapaneseIcedCoffee')
    expect(tags).not.toContain('Coffee')
  })

  it('collapses spaces and punctuation into a single tag', () => {
    const tags = buildHashtags(
      { brew: brew({ brewerName: 'Hario V60' }), bean: { roaster: 'Onyx Coffee Lab' } },
      'instagram',
    )
    expect(tags).toContain('HarioV60')
    expect(tags).toContain('OnyxCoffeeLab')
  })

  it('adds Shorts on YouTube and nowhere else', () => {
    expect(buildHashtags({ brew: brew() }, 'youtube')[0]).toBe('Shorts')
    expect(buildHashtags({ brew: brew() }, 'instagram')).not.toContain('Shorts')
    expect(buildHashtags({ brew: brew() }, 'tiktok')).not.toContain('Shorts')
  })

  it('credits the method author when the recipe has one', () => {
    const tags = buildHashtags({ brew: brew(), recipeName: '4:6 Method (balanced)' }, 'instagram')
    expect(tags).toContain('TetsuKasuya')
  })
})

describe('YouTube', () => {
  it('gets a title, and the others do not', () => {
    expect(generateCaption({ brew: brew() }, 'youtube').title).toBeTruthy()
    expect(generateCaption({ brew: brew() }, 'instagram').title).toBeUndefined()
    expect(generateCaption({ brew: brew() }, 'tiktok').title).toBeUndefined()
  })

  // A Shorts title is a search query: concrete nouns and numbers, not a feeling.
  it('leads the title with gear and numbers', () => {
    const c = generateCaption(
      {
        brew: brew({ brewerName: 'Hario V60', iced: true, waterTempC: 94 }),
        bean: { country: 'Kenya', processLabel: 'Washed' },
      },
      'youtube',
    )
    expect(c.title).toMatch(/^Japanese Iced Hario V60 Kenya Washed/)
    expect(c.title).toMatch(/20:320/)
    expect(c.title).toMatch(/94°C/)
  })

  it('never exceeds the 100-character title limit', () => {
    const c = generateCaption(
      {
        brew: brew({ brewerName: 'A'.repeat(60), iced: true }),
        bean: { country: 'B'.repeat(60), processLabel: 'C'.repeat(60) },
      },
      'youtube',
    )
    expect(c.title!.length).toBeLessThanOrEqual(100)
    expect(c.title).toMatch(/…$/)
  })
})

describe('personal best', () => {
  const bag = (i: number, score: number) => brew({ id: `b${i}`, score, beanId: 'bean-1' })

  it('needs enough scored brews on the bag to mean anything', () => {
    const two = [bag(1, 9), bag(2, 5)]
    expect(isPersonalBest(two[0]!, two)).toBe(false)
    const four = [bag(1, 9), bag(2, 5), bag(3, 6), bag(4, 7)]
    expect(isPersonalBest(four[0]!, four)).toBe(true)
  })

  it('is false when something on the bag scored higher', () => {
    const all = [bag(1, 7), bag(2, 9), bag(3, 6)]
    expect(isPersonalBest(all[0]!, all)).toBe(false)
    expect(isPersonalBest(all[1]!, all)).toBe(true)
  })

  it('is false for an unscored brew', () => {
    const all = [brew({ id: 'x', beanId: 'bean-1' }), bag(2, 5), bag(3, 6)]
    expect(isPersonalBest(all[0]!, all)).toBe(false)
  })

  it('compares within the bag, not across the whole journal', () => {
    const mine = brew({ id: 'm', score: 7, beanId: 'bean-1' })
    const all = [
      mine,
      brew({ id: 'a', score: 6, beanId: 'bean-1' }),
      brew({ id: 'b', score: 5, beanId: 'bean-1' }),
      brew({ id: 'c', score: 10, beanId: 'bean-2' }),
    ]
    expect(isPersonalBest(mine, all)).toBe(true)
  })
})

describe('the pour schedule', () => {
  const schedule = [
    { atS: 0, toG: 45, label: 'Bloom' },
    { atS: 45, toG: 105, label: 'Pour 1' },
    { atS: 80, toG: 175, label: 'Pour 2' },
    { atS: 115, toG: 250, label: 'Pour 3' },
    { atS: 150, toG: 320, label: 'Pour 4' },
  ]

  it('prints cumulative targets against the clock, because that is what the scale reads', () => {
    const c = generateCaption({ brew: brew(), pours: schedule }, 'instagram')
    expect(c.body).toContain('🫗 Pours')
    expect(c.body).toMatch(/0:00 → 45 g {2}\(bloom\)/)
    expect(c.body).toMatch(/0:45 → 105 g/)
    expect(c.body).toMatch(/2:30 → 320 g/)
  })

  it('marks the bloom and nothing else', () => {
    const c = generateCaption({ brew: brew(), pours: schedule }, 'instagram')
    expect(c.body.match(/\(bloom\)/g)).toHaveLength(1)
  })

  it('reads the schedule off the record when the caller passes none', () => {
    const c = generateCaption({ brew: brew({ pours: schedule }) }, 'tiktok')
    expect(c.body).toMatch(/1:55 → 250 g/)
  })

  // A generated recipe brewed before the record stored a schedule has none, and
  // inventing a plausible one would be inventing what somebody poured.
  it('omits the block entirely rather than guessing', () => {
    const c = generateCaption({ brew: brew() }, 'instagram')
    expect(c.body).not.toContain('Pours')
    expect(c.body).not.toContain('→')
  })

  it('leaves every platform inside its limit with a long schedule', () => {
    const long = Array.from({ length: 9 }, (_, i) => ({
      atS: i * 30,
      toG: 40 + i * 35,
      label: i === 0 ? 'Bloom' : `Pour ${i}`,
    }))
    for (const p of ALL) {
      const c = generateCaption({ brew: brew({ notes: 'x'.repeat(300) }), pours: long }, p)
      expect(c.chars, p).toBeLessThanOrEqual(c.limit)
    }
  })

  it('keeps the hook first, so the schedule never eats the fold', () => {
    const c = generateCaption({ brew: brew({ score: 9 }), pours: schedule }, 'instagram', {
      personalBest: true,
    })
    expect(c.body.indexOf('Best cup')).toBeLessThan(c.body.indexOf('🫗'))
    expect(c.hookFits).toBe(true)
  })
})
