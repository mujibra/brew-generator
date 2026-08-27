import type { BeanRecord, BrewRecord } from '@/lib/db/repository'
import { describe, expect, it } from 'vitest'
import {
  LOW_STOCK_BREWS,
  beanAge,
  beanFreshness,
  beanTimeline,
  beanToGenerateInput,
  brewsLeft,
  consumeDose,
  emptyBean,
  isLowStock,
  roastLabel,
  summariseShelf,
} from './bean'

const DAY = 86_400_000
const NOW = new Date(2026, 7, 20, 12).getTime()
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString()

function bean(over: Partial<BeanRecord> = {}): BeanRecord {
  return {
    id: over.id ?? 'bean1',
    updatedAt: 0,
    name: 'Nyeri AA',
    roaster: 'Some Roaster',
    sizeG: 250,
    remainingG: 250,
    ...over,
  }
}

function brew(over: Partial<BrewRecord> = {}): BrewRecord {
  return {
    id: over.id ?? `b${Math.random()}`,
    updatedAt: 0,
    startedAt: NOW,
    doseG: 20,
    waterG: 320,
    totalTimeS: 210,
    ...over,
  }
}

describe('beanAge', () => {
  it('counts days since the roast date', () => {
    expect(beanAge(bean({ roastDate: iso(10) }), NOW)).toBe(10)
    expect(beanAge(bean({ roastDate: iso(0) }), NOW)).toBe(0)
  })

  it('is undefined when the bag never said', () => {
    expect(beanAge(bean(), NOW)).toBeUndefined()
  })

  it('is undefined for an unparseable date rather than NaN', () => {
    expect(beanAge(bean({ roastDate: 'not a date' }), NOW)).toBeUndefined()
  })
})

describe('beanFreshness', () => {
  it('assesses a bag with a roast date and level', () => {
    const f = beanFreshness(bean({ roastDate: iso(10), roastLevel: 'light' }), [], NOW)
    expect(f?.state).toBe('peak')
    expect(f?.daysOffRoast).toBe(10)
  })

  it('calls a 2-day-old light roast resting', () => {
    expect(beanFreshness(bean({ roastDate: iso(2), roastLevel: 'light' }), [], NOW)?.state).toBe(
      'resting',
    )
  })

  it('refuses to guess without a roast date or level', () => {
    expect(beanFreshness(bean({ roastLevel: 'light' }), [], NOW)).toBeNull()
    expect(beanFreshness(bean({ roastDate: iso(10) }), [], NOW)).toBeNull()
  })

  it('personalises the window from this bag own scored brews', () => {
    // A light roast's stock peak window is 7-18 days, so at 20 days this bag
    // reads as merely 'good' on the generic curve...
    const b = bean({ id: 'x', roastDate: iso(20), roastLevel: 'light' })
    expect(beanFreshness(b, [], NOW)?.state).toBe('good')

    // ...but six strong brews centred on day 17.5 shift the window +2.5 days,
    // to 9.5-20.5, which puts day 20 back inside this user's own peak.
    const brews = Array.from({ length: 6 }, (_, i) =>
      brew({ beanId: 'x', score: 9, daysOffRoast: 15 + i }),
    )
    const f = beanFreshness(b, brews, NOW)
    expect(f?.personalised).toBe(true)
    expect(f?.window.peakEnd).toBeCloseTo(20.5, 6)
    expect(f?.state).toBe('peak')
  })

  it('ignores brews belonging to other bags', () => {
    const b = bean({ id: 'x', roastDate: iso(26), roastLevel: 'light' })
    const other = Array.from({ length: 6 }, () =>
      brew({ beanId: 'someone-else', score: 9, daysOffRoast: 26 }),
    )
    expect(beanFreshness(b, other, NOW)?.personalised).toBe(false)
  })

  it('derives days off roast for brews that did not record it', () => {
    const b = bean({ id: 'x', roastDate: iso(30), roastLevel: 'light' })
    const brews = Array.from({ length: 6 }, (_, i) =>
      brew({ beanId: 'x', score: 9, startedAt: NOW - (4 - 0) * DAY - i * DAY }),
    )
    expect(beanFreshness(b, brews, NOW)?.personalised).toBe(true)
  })
})

describe('brewsLeft and low stock', () => {
  it('divides what is left by the dose', () => {
    expect(brewsLeft(bean({ remainingG: 100 }), 20)).toBe(5)
    expect(brewsLeft(bean({ remainingG: 95 }), 20)).toBe(4)
    expect(brewsLeft(bean({ remainingG: 0 }), 20)).toBe(0)
  })

  it('does not divide by zero', () => {
    expect(brewsLeft(bean(), 0)).toBe(0)
  })

  it('flags a bag down to its last couple of brews', () => {
    expect(isLowStock(bean({ remainingG: 40 }), 20)).toBe(true)
    expect(isLowStock(bean({ remainingG: 200 }), 20)).toBe(false)
  })

  it('does not flag an empty or archived bag as low stock', () => {
    expect(isLowStock(bean({ remainingG: 0 }), 20)).toBe(false)
    expect(isLowStock(bean({ remainingG: 20, archived: true }), 20)).toBe(false)
  })

  it('uses the documented threshold', () => {
    expect(isLowStock(bean({ remainingG: LOW_STOCK_BREWS * 20 }), 20)).toBe(true)
    expect(isLowStock(bean({ remainingG: (LOW_STOCK_BREWS + 1) * 20 }), 20)).toBe(false)
  })
})

describe('consumeDose', () => {
  it('subtracts the dose', () => {
    const { bean: next, shortfallG } = consumeDose(bean({ remainingG: 250 }), 20)
    expect(next.remainingG).toBe(230)
    expect(shortfallG).toBe(0)
  })

  // PRD F5.3: never negative, warns but permits.
  it('clamps at zero and reports the shortfall', () => {
    const { bean: next, shortfallG } = consumeDose(bean({ remainingG: 15 }), 20)
    expect(next.remainingG).toBe(0)
    expect(shortfallG).toBe(5)
  })

  it('does not mutate the original', () => {
    const original = bean({ remainingG: 250 })
    consumeDose(original, 20)
    expect(original.remainingG).toBe(250)
  })

  it('rejects a negative dose', () => {
    expect(() => consumeDose(bean(), -1)).toThrow(RangeError)
  })
})

describe('beanToGenerateInput', () => {
  it('passes through what the bag knows', () => {
    const input = beanToGenerateInput(
      bean({ roastLevel: 'light', altitudeMasl: 1800, roastDate: iso(9) }),
      NOW,
    )
    expect(input).toEqual({ roastLevel: 'light', altitudeMasl: 1800, daysOffRoast: 9 })
  })

  it('omits what it does not know rather than inventing it', () => {
    expect(beanToGenerateInput(bean(), NOW)).toEqual({})
  })
})

describe('beanTimeline', () => {
  it('plots score against days off roast, oldest first', () => {
    const b = bean({ id: 'x', roastDate: iso(20) })
    const points = beanTimeline(b, [
      brew({ id: 'late', beanId: 'x', score: 9, daysOffRoast: 14 }),
      brew({ id: 'early', beanId: 'x', score: 5, daysOffRoast: 4 }),
    ])
    expect(points.map((p) => p.daysOffRoast)).toEqual([4, 14])
    expect(points.map((p) => p.score)).toEqual([5, 9])
  })

  it('skips unscored brews and other bags', () => {
    const b = bean({ id: 'x', roastDate: iso(20) })
    const points = beanTimeline(b, [
      brew({ beanId: 'x', score: 8, daysOffRoast: 5 }),
      brew({ beanId: 'x', daysOffRoast: 6 }),
      brew({ beanId: 'y', score: 9, daysOffRoast: 7 }),
    ])
    expect(points).toHaveLength(1)
  })

  it('is empty without a roast date, because the x axis would be meaningless', () => {
    expect(beanTimeline(bean({ id: 'x' }), [brew({ beanId: 'x', score: 8 })])).toEqual([])
  })

  it('derives days off roast when the brew did not record it', () => {
    const b = bean({ id: 'x', roastDate: iso(20) })
    const points = beanTimeline(b, [brew({ beanId: 'x', score: 8, startedAt: NOW - 5 * DAY })])
    expect(points[0]!.daysOffRoast).toBe(15)
  })
})

describe('summariseShelf', () => {
  it('separates active from archived and totals what is left', () => {
    const s = summariseShelf(
      [
        bean({ id: 'a', remainingG: 100 }),
        bean({ id: 'b', remainingG: 50 }),
        bean({ id: 'c', remainingG: 200, archived: true }),
      ],
      NOW,
      20,
    )
    expect(s.active.map((b) => b.id).sort()).toEqual(['a', 'b'])
    expect(s.archived.map((b) => b.id)).toEqual(['c'])
    expect(s.totalRemainingG).toBe(150)
  })

  it('sorts the freshest bag first', () => {
    const s = summariseShelf(
      [
        bean({ id: 'old', roastDate: iso(30) }),
        bean({ id: 'fresh', roastDate: iso(3) }),
        bean({ id: 'mid', roastDate: iso(12) }),
      ],
      NOW,
      20,
    )
    expect(s.active.map((b) => b.id)).toEqual(['fresh', 'mid', 'old'])
  })

  it('puts bags with no roast date last rather than first', () => {
    const s = summariseShelf(
      [bean({ id: 'unknown' }), bean({ id: 'dated', roastDate: iso(40) })],
      NOW,
      20,
    )
    expect(s.active.map((b) => b.id)).toEqual(['dated', 'unknown'])
  })

  it('collects the bags running low', () => {
    const s = summariseShelf(
      [bean({ id: 'low', remainingG: 30 }), bean({ id: 'plenty', remainingG: 250 })],
      NOW,
      20,
    )
    expect(s.lowStock.map((b) => b.id)).toEqual(['low'])
  })
})

describe('emptyBean', () => {
  // PRD F5.3: a bean needs only a name to exist.
  it('is valid with nothing filled in', () => {
    const b = emptyBean('id1', NOW)
    expect(b.remainingG).toBe(b.sizeG)
    expect(beanFreshness(b, [], NOW)).toBeNull()
    expect(brewsLeft(b, 20)).toBe(12)
  })
})

describe('roastLabel', () => {
  it('labels every level and says so when unknown', () => {
    expect(roastLabel('mediumDark')).toBe('Medium-dark')
    expect(roastLabel(undefined)).toBe('Unknown roast')
  })
})
