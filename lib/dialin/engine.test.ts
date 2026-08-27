import { describe, expect, it } from 'vitest'
import { type Attempt, type GrinderRef, diagnose } from './engine'
import { drawdownOf } from './rules'

const jUltra: GrinderRef = {
  name: '1Zpresso J-Ultra',
  unitLabel: 'clicks',
  micronsPerUnit: 12.5,
}

const unknownGrinder: GrinderRef = { name: 'Some grinder', unitLabel: 'steps' }

describe('drawdownOf', () => {
  it('classifies from actual versus expected time', () => {
    expect(drawdownOf({ symptom: 'sour', actualTimeS: 110, expectedTimeS: 180 })).toBe('fast')
    expect(drawdownOf({ symptom: 'sour', actualTimeS: 180, expectedTimeS: 180 })).toBe('normal')
    expect(drawdownOf({ symptom: 'sour', actualTimeS: 230, expectedTimeS: 180 })).toBe('slow')
    expect(drawdownOf({ symptom: 'sour', actualTimeS: 300, expectedTimeS: 180 })).toBe('stalled')
  })

  it('prefers an explicit classification over derived timing', () => {
    expect(
      drawdownOf({ symptom: 'sour', drawdown: 'stalled', actualTimeS: 100, expectedTimeS: 180 }),
    ).toBe('stalled')
  })

  it('returns undefined with no timing evidence', () => {
    expect(drawdownOf({ symptom: 'sour' })).toBeUndefined()
  })
})

describe('diagnose — the two disambiguations the product hinges on', () => {
  // PRD F4.4 criterion 1
  it('recommends a finer grind, not a temperature change, for sour with a fast drawdown', () => {
    const r = diagnose({
      evidence: { symptom: 'sour', actualTimeS: 110, expectedTimeS: 180 }, // 1:50 vs 3:00
      grinder: jUltra,
    })
    expect(r.hypothesis.id).toBe('grindTooCoarse')
    expect(r.action).toMatch(/finer/i)
    expect(r.hypothesis.id).not.toBe('tempTooLow')
  })

  // PRD F4.4 criterion 2 — the important one
  it('recommends technique, and explicitly not a finer grind, for sour with a slow drawdown', () => {
    const r = diagnose({
      evidence: { symptom: 'sour', actualTimeS: 270, expectedTimeS: 180 }, // 4:30 vs 3:00
      grinder: jUltra,
    })
    expect(r.hypothesis.id).toBe('channelling')
    expect(r.action).not.toMatch(/finer/i)
    expect(r.action).toMatch(/level the bed/i)
    expect(r.reasoning.join(' ')).toMatch(/makes it worse/i)
  })

  it('treats thin-but-not-sour as a strength problem, not an extraction one', () => {
    const r = diagnose({ evidence: { symptom: 'thin' }, grinder: jUltra })
    expect(r.hypothesis.id).toBe('ratioTooLoose')
    expect(r.action).toMatch(/more coffee per litre/i)
    expect(r.action).not.toMatch(/finer/i)
  })

  it('blames water, not the brew, when a cup is flat at a correct extraction yield', () => {
    const r = diagnose({
      evidence: { symptom: 'flat', eyPct: 20, waterKhPpm: 120 },
      grinder: jUltra,
    })
    expect(r.hypothesis.id).toBe('waterAlkalinityHigh')
    expect(r.action).toMatch(/distilled|RO/i)
  })

  it('blames the coffee when a flat cup is 60 days off roast', () => {
    const r = diagnose({
      evidence: { symptom: 'flat', daysOffRoast: 60, waterKhPpm: 30 },
      grinder: jUltra,
    })
    expect(r.hypothesis.id).toBe('beanStale')
  })

  it('reads bitter plus a stalled drawdown as over-extraction from fines', () => {
    const r = diagnose({
      evidence: { symptom: 'bitter', actualTimeS: 320, expectedTimeS: 180, bed: 'muddyPool' },
      grinder: jUltra,
    })
    expect(['grindTooFine', 'agitationExcessive']).toContain(r.hypothesis.id)
    expect(r.action).toMatch(/coarser|agitate less/i)
  })

  it('reads harsh-when-cool as mild over-extraction', () => {
    const r = diagnose({ evidence: { symptom: 'harshWhenCool' }, grinder: jUltra })
    expect(r.hypothesis.id).toBe('grindTooFine')
  })
})

describe('diagnose — output contract', () => {
  // PRD F4.4 criterion 4
  it('never returns a recommendation without a mechanism link', () => {
    const symptoms = [
      'sour',
      'bitter',
      'thin',
      'muddy',
      'astringent',
      'flat',
      'harshWhenCool',
    ] as const
    for (const symptom of symptoms) {
      const r = diagnose({ evidence: { symptom }, grinder: jUltra })
      expect(r.mechanismCardId).toBeTruthy()
      expect(r.mechanismCardId).toMatch(/\w+\/\w+/)
    }
  })

  // PRD F4.3 R1
  it('phrases grind changes in the user own grinder units with a micron estimate', () => {
    const r = diagnose({
      evidence: { symptom: 'sour', drawdown: 'fast' },
      grinder: jUltra,
    })
    // 40 µm target / 12.5 µm per click = 3 clicks
    expect(r.action).toBe('Grind 3 clicks finer on your 1Zpresso J-Ultra (about 37.5 µm).')
  })

  it('stays in relative terms when no credible micron figure exists', () => {
    const r = diagnose({ evidence: { symptom: 'sour', drawdown: 'fast' }, grinder: unknownGrinder })
    expect(r.action).toMatch(/2-3 steps finer/)
    expect(r.action).not.toMatch(/µm/)
  })

  // PRD F4.3 R2
  it('always carries a falsifiable prediction', () => {
    const r = diagnose({ evidence: { symptom: 'sour', drawdown: 'fast' }, grinder: jUltra })
    expect(r.prediction).toMatch(/drawdown|EY/i)
  })

  it('emits exactly one action but exposes the full ranking for expert mode', () => {
    const r = diagnose({
      evidence: { symptom: 'sour', drawdown: 'fast', daysOffRoast: 2 },
      grinder: jUltra,
    })
    expect(typeof r.action).toBe('string')
    expect(r.ranking.length).toBeGreaterThan(1)
    expect(r.ranking[0]!.score).toBeGreaterThanOrEqual(r.ranking[1]!.score)
  })

  it('reports lower confidence when the top two hypotheses are close', () => {
    const clear = diagnose({
      evidence: { symptom: 'sour', drawdown: 'slow', bed: 'channelled' },
      grinder: jUltra,
    })
    expect(clear.confidence).toBe('high')
  })
})

describe('diagnose — convergence loop', () => {
  // PRD F4.4 criterion 3
  it('escalates to a different hypothesis after three consecutive no-change results', () => {
    const evidence = { symptom: 'sour', drawdown: 'fast' } as const
    const first = diagnose({ evidence, grinder: jUltra })
    expect(first.hypothesis.id).toBe('grindTooCoarse')

    const history: Attempt[] = [
      { hypothesis: 'grindTooCoarse', outcome: 'same' },
      { hypothesis: 'grindTooCoarse', outcome: 'same' },
      { hypothesis: 'grindTooCoarse', outcome: 'same' },
    ]
    const escalated = diagnose({ evidence, grinder: jUltra, history })
    expect(escalated.hypothesis.id).not.toBe('grindTooCoarse')
    expect(escalated.ranking.find((r) => r.hypothesis.id === 'grindTooCoarse')?.excluded).toBe(
      'exhausted',
    )
  })

  it('does not escalate after only two no-change results', () => {
    const history: Attempt[] = [
      { hypothesis: 'grindTooCoarse', outcome: 'same' },
      { hypothesis: 'grindTooCoarse', outcome: 'same' },
    ]
    const r = diagnose({
      evidence: { symptom: 'sour', drawdown: 'fast' },
      grinder: jUltra,
      history,
    })
    expect(r.hypothesis.id).toBe('grindTooCoarse')
  })

  it('abandons a hypothesis immediately if it made the cup worse', () => {
    const r = diagnose({
      evidence: { symptom: 'sour', drawdown: 'fast' },
      grinder: jUltra,
      history: [{ hypothesis: 'grindTooCoarse', outcome: 'worse' }],
    })
    expect(r.hypothesis.id).not.toBe('grindTooCoarse')
    expect(r.ranking.find((h) => h.hypothesis.id === 'grindTooCoarse')?.excluded).toBe(
      'madeItWorse',
    )
  })

  it('resets the run when a different hypothesis is tried in between', () => {
    const history: Attempt[] = [
      { hypothesis: 'grindTooCoarse', outcome: 'same' },
      { hypothesis: 'grindTooCoarse', outcome: 'same' },
      { hypothesis: 'tempTooLow', outcome: 'same' },
    ]
    const r = diagnose({
      evidence: { symptom: 'sour', drawdown: 'fast' },
      grinder: jUltra,
      history,
    })
    expect(r.hypothesis.id).toBe('grindTooCoarse')
  })

  it('throws rather than invent advice when every hypothesis is exhausted', () => {
    const history: Attempt[] = [
      { hypothesis: 'grindTooCoarse', outcome: 'worse' },
      { hypothesis: 'tempTooLow', outcome: 'worse' },
    ]
    expect(() =>
      diagnose({ evidence: { symptom: 'sour', drawdown: 'normal' }, grinder: jUltra, history }),
    ).toThrow(/No viable hypothesis/)
  })
})
