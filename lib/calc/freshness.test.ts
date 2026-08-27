import { describe, expect, it } from 'vitest'
import { type ScoredBrew, assessFreshness, daysOffRoast } from './freshness'

describe('daysOffRoast', () => {
  it('counts whole days', () => {
    const roast = new Date('2026-08-01T08:00:00Z')
    expect(daysOffRoast(roast, new Date('2026-08-08T09:00:00Z'))).toBe(7)
    expect(daysOffRoast(roast, new Date('2026-08-01T20:00:00Z'))).toBe(0)
  })
})

describe('assessFreshness', () => {
  it('calls a 3-day-old light roast resting, with an actionable note', () => {
    const a = assessFreshness({ roastLevel: 'light', daysOffRoast: 3 })
    expect(a.state).toBe('resting')
    expect(a.note).toMatch(/degassing/i)
    expect(a.note).toMatch(/4 more days/)
  })

  it('walks a light roast through every state', () => {
    const at = (d: number) => assessFreshness({ roastLevel: 'light', daysOffRoast: d }).state
    expect(at(3)).toBe('resting')
    expect(at(10)).toBe('peak')
    expect(at(25)).toBe('good')
    expect(at(40)).toBe('fading')
    expect(at(90)).toBe('stale')
  })

  it('gives dark roasts a shorter rest than light roasts', () => {
    expect(assessFreshness({ roastLevel: 'dark', daysOffRoast: 3 }).state).toBe('peak')
    expect(assessFreshness({ roastLevel: 'veryLight', daysOffRoast: 3 }).state).toBe('resting')
  })

  it('treats window boundaries as inclusive of peak', () => {
    expect(assessFreshness({ roastLevel: 'medium', daysOffRoast: 4 }).state).toBe('peak')
    expect(assessFreshness({ roastLevel: 'medium', daysOffRoast: 12 }).state).toBe('peak')
    expect(assessFreshness({ roastLevel: 'medium', daysOffRoast: 13 }).state).toBe('good')
  })

  it('is not personalised without enough scored brews', () => {
    const history: ScoredBrew[] = [
      { daysOffRoast: 25, score: 9 },
      { daysOffRoast: 26, score: 9 },
    ]
    const a = assessFreshness({ roastLevel: 'light', daysOffRoast: 25, history })
    expect(a.personalised).toBe(false)
    expect(a.state).toBe('good')
  })

  it('shifts the window toward where this user actually scores well', () => {
    // Six strong brews late in the bag's life should pull the window later,
    // so day 25 reads as peak rather than merely good.
    const history: ScoredBrew[] = Array.from({ length: 6 }, (_, i) => ({
      daysOffRoast: 24 + i,
      score: 9,
    }))
    const a = assessFreshness({ roastLevel: 'light', daysOffRoast: 25, history })
    expect(a.personalised).toBe(true)
    expect(a.window.peakEnd).toBeGreaterThan(18)
    expect(a.state).toBe('peak')
  })

  it('shifts at half strength so a few brews cannot yank the window', () => {
    const history: ScoredBrew[] = Array.from({ length: 6 }, () => ({
      daysOffRoast: 60,
      score: 10,
    }))
    const a = assessFreshness({ roastLevel: 'light', daysOffRoast: 60, history })
    // Prior centre is 12.5; observed 60; shift is (60-12.5)/2 = 23.75
    expect(a.window.peakEnd).toBeCloseTo(18 + 23.75, 6)
    expect(a.window.peakEnd).toBeLessThan(60)
  })

  it('ignores unscored brews', () => {
    const history: ScoredBrew[] = Array.from({ length: 6 }, (_, i) => ({
      daysOffRoast: 24 + i,
      score: 0,
    }))
    expect(assessFreshness({ roastLevel: 'light', daysOffRoast: 25, history }).personalised).toBe(
      false,
    )
  })
})
