import { compileRecipe, targetMassAt } from '@/lib/brew/steps'
import { describe, expect, it } from 'vitest'
import { BREWER_LIST } from './brewers'
import { type BrewGoal, GOALS, type GenerateInput, generateRecipe, toRunnable } from './generate'

const base: GenerateInput = {
  brewerId: 'v60',
  doseG: 20,
  goal: 'balance',
  roastLevel: 'light',
}

const gen = (over: Partial<GenerateInput> = {}) => generateRecipe({ ...base, ...over })

describe('structure', () => {
  it('produces a runnable recipe for every brewer and every goal', () => {
    for (const brewer of BREWER_LIST) {
      for (const goal of GOALS.map((g) => g.id)) {
        const dose = Math.max(brewer.doseRangeG.min, Math.min(20, brewer.doseRangeG.max))
        const r = gen({ brewerId: brewer.id, goal, doseG: dose })
        const compiled = compileRecipe({ doseG: r.doseG, prep: r.prep, steps: r.steps })
        expect(compiled.totalWaterG, `${brewer.id}/${goal}`).toBe(r.waterG)
        expect(compiled.steps.at(-1)?.kind).toBe('serve')
        expect(targetMassAt(compiled, compiled.totalS)).toBe(r.waterG)
      }
    }
  })

  it('always ends the last pour exactly on the total water', () => {
    for (const goal of GOALS.map((g) => g.id)) {
      const r = gen({ goal })
      expect(r.pours.at(-1)?.toG, goal).toBe(r.waterG)
    }
  })

  it('has strictly increasing cumulative pour targets', () => {
    const r = gen({ goal: 'sweetness' })
    for (let i = 1; i < r.pours.length; i++) {
      expect(r.pours[i]!.toG).toBeGreaterThan(r.pours[i - 1]!.toG)
      expect(r.pours[i]!.addG).toBeGreaterThan(0)
    }
  })

  it('attaches a reason to every number', () => {
    const r = gen({ altitudeMasl: 1900, daysOffRoast: 3 })
    const headings = r.rationale.map((s) => s.heading)
    expect(headings).toContain('Ratio')
    expect(headings).toContain('Temperature')
    expect(headings).toContain('Grind')
    expect(headings).toContain('Pours')
    for (const section of r.rationale) {
      expect(section.value, section.heading).toBeTruthy()
      expect(section.lines.length, section.heading).toBeGreaterThan(0)
    }
  })
})

describe('goal changes the recipe in the direction it claims', () => {
  it('body is tighter and hotter than clarity', () => {
    const body = gen({ goal: 'body' })
    const clarity = gen({ goal: 'clarity' })
    expect(body.ratio).toBeLessThan(clarity.ratio)
    expect(body.waterTempC).toBeGreaterThan(clarity.waterTempC)
    expect(body.grind.targetMicrons).toBeLessThan(clarity.grind.targetMicrons)
  })

  it('acidity grinds coarser and brews cooler than body', () => {
    const acidity = gen({ goal: 'acidity' })
    const body = gen({ goal: 'body' })
    expect(acidity.grind.targetMicrons).toBeGreaterThan(body.grind.targetMicrons)
    expect(acidity.waterTempC).toBeLessThan(body.waterTempC)
  })

  it('sweetness splits the first block into two smaller pours', () => {
    expect(gen({ goal: 'sweetness' }).pours.filter((p) => p.phase === 'A')).toHaveLength(2)
    expect(gen({ goal: 'acidity' }).pours.filter((p) => p.phase === 'A')).toHaveLength(1)
  })

  it('body uses more pours in the second block than clarity', () => {
    const body = gen({ goal: 'body' }).pours.filter((p) => p.phase === 'B').length
    const clarity = gen({ goal: 'clarity' }).pours.filter((p) => p.phase === 'B').length
    expect(body).toBeGreaterThan(clarity)
  })

  it('skips the final swirl only when chasing clarity', () => {
    const hasSwirl = (goal: BrewGoal) =>
      gen({ goal }).steps.some((s) => s.kind === 'agitate' && s.style === 'swirl')
    expect(hasSwirl('clarity')).toBe(false)
    expect(hasSwirl('sweetness')).toBe(true)
  })
})

describe('roast level', () => {
  it('grinds finer and brews hotter for lighter roasts', () => {
    const veryLight = gen({ roastLevel: 'veryLight' })
    const dark = gen({ roastLevel: 'dark' })
    expect(veryLight.grind.targetMicrons).toBeLessThan(dark.grind.targetMicrons)
    expect(veryLight.waterTempC).toBeGreaterThan(dark.waterTempC)
  })

  it('never suggests boiling water', () => {
    for (const roastLevel of ['veryLight', 'light', 'medium', 'dark'] as const) {
      expect(gen({ roastLevel, goal: 'body', altitudeMasl: 2200 }).waterTempC).toBeLessThanOrEqual(
        96,
      )
    }
  })

  it('blooms shorter and smaller on dark roasts', () => {
    const dark = gen({ roastLevel: 'dark' })
    const light = gen({ roastLevel: 'light' })
    expect(dark.pours[0]!.toG).toBeLessThan(light.pours[0]!.toG)
  })
})

describe('altitude', () => {
  it('grinds finer and adds heat for high-grown beans', () => {
    const high = gen({ altitudeMasl: 2000 })
    const low = gen({ altitudeMasl: 900 })
    expect(high.grind.targetMicrons).toBeLessThan(low.grind.targetMicrons)
    expect(high.waterTempC).toBeGreaterThan(low.waterTempC)
  })

  it('explains the density reasoning rather than just moving the number', () => {
    const grind = gen({ altitudeMasl: 2000 }).rationale.find((s) => s.heading === 'Grind')
    expect(grind?.lines.join(' ')).toMatch(/dense/i)
  })

  it('changes nothing when altitude is unknown', () => {
    expect(gen({ altitudeMasl: undefined }).grind.targetMicrons).toBe(
      gen({ altitudeMasl: 1300 }).grind.targetMicrons,
    )
  })
})

describe('freshness', () => {
  it('blooms longer and bigger on very fresh coffee, and says why', () => {
    const fresh = gen({ daysOffRoast: 2 })
    const rested = gen({ daysOffRoast: 14 })
    expect(fresh.pours[0]!.toG).toBeGreaterThan(rested.pours[0]!.toG)
    expect(fresh.rationale.find((s) => s.heading === 'Bloom')?.lines.join(' ')).toMatch(/CO2/)
  })
})

describe('brewer constraints', () => {
  it('caps pours at what the bed tolerates and explains the cap', () => {
    const chemex = gen({ brewerId: 'chemex', goal: 'sweetness', doseG: 30 })
    expect(chemex.pours.length - 1).toBeLessThanOrEqual(3)
    expect(chemex.rationale.find((s) => s.heading === 'Pours')?.lines.join(' ')).toMatch(/Capped/)
  })

  it('grinds a Chemex coarser than a V60 at the same settings', () => {
    expect(gen({ brewerId: 'chemex', doseG: 30 }).grind.targetMicrons).toBeGreaterThan(
      gen({ brewerId: 'v60', doseG: 30 }).grind.targetMicrons,
    )
  })

  it('gives immersion brewers one pour and a steep instead of a schedule', () => {
    const press = gen({ brewerId: 'frenchPress', doseG: 30 })
    expect(press.pours).toHaveLength(1)
    expect(press.rationale.map((s) => s.heading)).toContain('Steep')
    expect(press.steps.some((s) => s.kind === 'wait')).toBe(true)
  })

  it('adds the immersion phase and the valve step for a Switch', () => {
    const sw = gen({ brewerId: 'switch', doseG: 20 })
    expect(sw.steps.some((s) => s.kind === 'flip')).toBe(true)
  })

  it('warns when the dose is outside the brewer range instead of silently allowing it', () => {
    expect(gen({ brewerId: 'aeropress', doseG: 35 }).warnings.join(' ')).toMatch(/outside/i)
    expect(gen({ brewerId: 'v60', doseG: 20 }).warnings).toEqual([])
  })
})

describe('grinder translation', () => {
  it('gives an absolute setting with an uncertainty band when no baseline is set', () => {
    const r = gen({ grinderId: 'comandante-c40' })
    expect(r.grind.settingUnits).toBeGreaterThan(0)
    expect(r.grind.text).toMatch(/give or take/)
    expect(r.grind.caveat).toBeTruthy()
  })

  it('prefers a delta from the user own baseline when they have one', () => {
    const r = gen({ grinderId: 'comandante-c40', baselineSetting: 28, roastLevel: 'veryLight' })
    expect(r.grind.deltaFromBaseline).toBeDefined()
    expect(r.grind.text).toMatch(/finer than your usual 28/)
    expect(r.grind.caveat).toMatch(/baseline/i)
  })

  it('stays descriptive for a grinder with no credible step size', () => {
    const r = gen({ grinderId: 'other' })
    expect(r.grind.settingUnits).toBeUndefined()
    expect(r.grind.text).toMatch(/medium|fine|coarse/)
  })

  it('flags a setting outside the grinder usual filter range', () => {
    const r = gen({ grinderId: 'baratza-encore', goal: 'body', roastLevel: 'veryLight' })
    expect(r.grind.caveat).toBeTruthy()
  })
})

describe('ratio override', () => {
  it('respects an explicit ratio', () => {
    const r = gen({ ratioOverride: 14 })
    expect(r.ratio).toBe(14)
    expect(r.waterG).toBe(280)
  })
})

describe('choosing the pour count', () => {
  it('reports what the goal suggested alongside what was used', () => {
    const r = gen({ goal: 'sweetness' })
    expect(r.pourPlan.suggested).toEqual({ a: 2, b: 3 })
    expect(r.pourPlan.counts).toEqual({ a: 2, b: 3 })
    expect(r.pourPlan.overridden).toBe(false)
  })

  it('honours an explicit split', () => {
    const r = gen({ goal: 'balance', poursOverride: { a: 2, b: 2 } })
    expect(r.pours.filter((p) => p.phase === 'A')).toHaveLength(2)
    expect(r.pours.filter((p) => p.phase === 'B')).toHaveLength(2)
    expect(r.pourPlan.overridden).toBe(true)
    expect(r.pours.at(-1)?.toG).toBe(r.waterG)
  })

  it('still lands exactly on the total water at any split', () => {
    for (const a of [0, 1, 2, 3]) {
      for (const b of [1, 2, 3, 4]) {
        const r = gen({ poursOverride: { a, b } })
        expect(r.pours.at(-1)?.toG, `${a}+${b}`).toBe(r.waterG)
        for (let i = 1; i < r.pours.length; i++) {
          expect(r.pours[i]!.addG, `${a}+${b} pour ${i}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('rolls the first block into the second when it is skipped entirely', () => {
    const r = gen({ poursOverride: { a: 0, b: 2 } })
    expect(r.pours.filter((p) => p.phase === 'A')).toHaveLength(0)
    expect(r.pours.filter((p) => p.phase === 'B')).toHaveLength(2)
    expect(r.pours.at(-1)?.toG).toBe(r.waterG)
  })

  it('warns rather than blocks when the split exceeds what the bed takes', () => {
    const r = gen({ brewerId: 'chemex', doseG: 30, poursOverride: { a: 3, b: 4 } })
    expect(r.pourPlan.overCap).toBe(true)
    expect(r.pours.filter((p) => p.phase !== 'bloom')).toHaveLength(7)
    expect(r.warnings.join(' ')).toMatch(/more than the 3/)
  })

  it('says in the rationale that the user chose the split', () => {
    const lines = gen({ goal: 'sweetness', poursOverride: { a: 1, b: 1 } }).rationale.find(
      (s) => s.heading === 'Pours',
    )?.lines
    expect(lines?.join(' ')).toMatch(/You chose this split.*suggestion was 2 \+ 3/)
  })

  it('ignores a pour override on an immersion brewer', () => {
    const r = gen({ brewerId: 'frenchPress', doseG: 30, poursOverride: { a: 3, b: 3 } })
    expect(r.pours).toHaveLength(1)
    expect(r.pourPlan.counts).toEqual({ a: 0, b: 0 })
  })

  it('never allows zero pours in the second block', () => {
    const r = gen({ poursOverride: { a: 2, b: 0 } })
    expect(r.pours.filter((p) => p.phase === 'B').length).toBeGreaterThanOrEqual(1)
  })
})

describe('grinder registry', () => {
  it('translates the Timemore Chestnut S3 at 15 µm per click', () => {
    const r = gen({ grinderId: 'timemore-s3' })
    expect(r.grinder?.name).toBe('Timemore Chestnut S3')
    expect(r.grinder?.micronsPerUnit).toBe(15)
    // V60 at a light roast targets 660 µm, so 660 / 15 = 44 clicks.
    expect(r.grind.targetMicrons).toBe(660)
    expect(r.grind.settingUnits).toBe(44)
    expect(r.grind.text).toMatch(/44 clicks/)
  })

  it('gives the S3 a tighter uncertainty band than a coarser-stepped grinder', () => {
    // 30 µm of uncertainty is 2 clicks at 15 µm/click, but only 1 at 30 µm/click.
    const s3 = gen({ grinderId: 'timemore-s3' })
    const comandante = gen({ grinderId: 'comandante-c40' })
    expect(s3.grind.uncertaintyUnits).toBe(2)
    expect(comandante.grind.uncertaintyUnits).toBe(1)
  })

  it('keeps the S3 inside its usual filter range at a normal recipe', () => {
    const r = gen({ grinderId: 'timemore-s3' })
    expect(r.grind.settingUnits!).toBeGreaterThanOrEqual(38)
    expect(r.grind.settingUnits!).toBeLessThanOrEqual(64)
    expect(r.grind.caveat).not.toMatch(/suspicion/)
  })
})

describe('the recipe carries its grind number, not only the sentence', () => {
  // Dropping this was the bug: the brew log had no number from the recipe and
  // fell back to a stale Gear baseline, so the dial-in then moved from the
  // wrong starting point.
  it('exposes the setting as a number the log can pre-fill with', () => {
    const r = gen({ grinderId: 'timemore-s3' })
    const runnable = toRunnable(r)
    expect(r.grind.settingUnits).toBeGreaterThan(0)
    expect(runnable.grindSetting).toBe(String(r.grind.settingUnits))
  })

  it('matches the number quoted in the prose', () => {
    const r = gen({ grinderId: 'timemore-s3' })
    const runnable = toRunnable(r)
    expect(r.grind.text).toContain(String(runnable.grindSetting))
  })

  it('respects a baseline, so the number is anchored to the user own setting', () => {
    const r = gen({ grinderId: 'timemore-s3', baselineSetting: 63, brewerId: 'v60' })
    const runnable = toRunnable(r)
    // 63 plus the roast/goal offset in clicks, not a bare micron division.
    expect(r.grind.deltaFromBaseline).toBeDefined()
    expect(Number(runnable.grindSetting)).toBe(63 + (r.grind.deltaFromBaseline ?? 0))
  })

  it('omits the number when the grinder has no credible step size', () => {
    expect(toRunnable(gen({ grinderId: 'other' })).grindSetting).toBeUndefined()
    expect(toRunnable(gen({})).grindSetting).toBeUndefined()
  })
})

describe('Japanese iced', () => {
  const iced = (over: Partial<GenerateInput> = {}) => gen({ iced: true, ...over })

  // The whole point: the ice is part of the recipe water, so the drink lands at
  // full strength instead of being watered down by ice added afterwards.
  it('takes the ice out of the total rather than adding to it', () => {
    const hot = gen()
    const cold = iced()
    expect(cold.waterG).toBe(hot.waterG)
    expect(cold.ice.iceG + cold.ice.hotWaterG).toBe(cold.waterG)
    expect(cold.ice.iceG).toBeGreaterThan(0)
  })

  it('splits roughly 40 % as ice', () => {
    const r = iced()
    expect(r.ice.iceG / r.waterG).toBeGreaterThan(0.3)
    expect(r.ice.iceG / r.waterG).toBeLessThan(0.5)
  })

  it('pours only the hot water, because the ice is already in the carafe', () => {
    const r = iced()
    expect(r.pours.at(-1)?.toG).toBe(r.ice.hotWaterG)
    expect(r.pours.at(-1)?.toG).toBeLessThan(r.waterG)
  })

  it('tells you to weigh the ice before brewing', () => {
    const prep = iced()
      .prep.map((p) => `${p.label} ${p.instruction}`)
      .join(' ')
    expect(prep).toMatch(/ice/i)
    expect(prep).toMatch(/zero your scale/i)
  })

  // Less hot water through the bed means less time to extract in.
  it('grinds finer than the hot version', () => {
    expect(iced().grind.targetMicrons).toBeLessThan(gen().grind.targetMicrons)
  })

  it('explains the method rather than just splitting the number', () => {
    const ice = iced().rationale.find((s) => s.heading === 'Ice')
    expect(ice).toBeDefined()
    expect(ice?.lines.join(' ')).toMatch(/aromatic/i)
    expect(ice?.lines.join(' ')).toMatch(/full strength/i)
  })

  it('is off by default, and adds nothing when off', () => {
    const hot = gen()
    expect(hot.iced).toBe(false)
    expect(hot.ice).toEqual({ iceG: 0, hotWaterG: hot.waterG, fraction: 0, hotRatio: hot.ratio })
    expect(hot.rationale.some((s) => s.heading === 'Ice')).toBe(false)
  })

  it('works on a French press by decanting onto ice rather than dripping', () => {
    const r = iced({ brewerId: 'frenchPress', doseG: 30 })
    expect(r.iced).toBe(true)
    expect(r.ice.iceG).toBeGreaterThan(0)
    const serve = r.steps.find((s) => s.kind === 'serve')
    expect(serve?.instruction).toMatch(/decant/i)
    // The sediment rule still applies — iced must not throw it away.
    expect(serve?.instruction).toMatch(/last centimetre/i)
  })

  it('brews hotter than the same recipe hot, because the bed gets less water', () => {
    expect(iced({ roastLevel: 'medium' }).waterTempC).toBeGreaterThan(
      gen({ roastLevel: 'medium' }).waterTempC,
    )
  })

  it('never lets the bloom eat the scarce hot water', () => {
    const r = iced({ daysOffRoast: 2, iceFractionOverride: 0.6 })
    expect(r.pours[0]!.toG / r.ice.hotWaterG).toBeLessThanOrEqual(0.25)
  })

  it('reports what the bed sees, not just what the drink lands at', () => {
    const r = iced()
    expect(r.ice.hotRatio).toBeCloseTo(r.ice.hotWaterG / r.doseG, 1)
    expect(r.ice.hotRatio).toBeLessThan(r.ratio)
    expect(r.ice.fraction).toBeCloseTo(0.4, 2)
  })

  it('says cubes, not crushed — crushed melts before the brew lands', () => {
    expect(
      iced()
        .prep.map((p) => p.instruction)
        .join(' '),
    ).toMatch(/not crushed/i)
  })

  it('works on the AeroPress, which presses onto ice', () => {
    const r = iced({ brewerId: 'aeropress', doseG: 15 })
    expect(r.iced).toBe(true)
    expect(r.ice.iceG).toBeGreaterThan(0)
  })

  it('carries the method, goal and ice onto the runnable recipe', () => {
    const r = iced()
    const runnable = toRunnable(r)
    expect(runnable.iced).toBe(true)
    expect(runnable.iceG).toBe(r.ice.iceG)
    expect(runnable.brewerId).toBe('v60')
    expect(runnable.goal).toBe(r.goal)
  })
})

describe('manual ratio', () => {
  it('overrides the goal default and moves the water with it', () => {
    expect(gen({ goal: 'body' }).ratio).toBe(15)
    const wide = gen({ goal: 'body', ratioOverride: 18 })
    expect(wide.ratio).toBe(18)
    expect(wide.waterG).toBe(360) // 20 g at 1:18
  })

  it('leaves grind and temperature alone — ratio is strength, not extraction', () => {
    const a = gen({ ratioOverride: 14 })
    const b = gen({ ratioOverride: 19 })
    expect(a.grind.targetMicrons).toBe(b.grind.targetMicrons)
    expect(a.waterTempC).toBe(b.waterTempC)
  })

  it('still splits the ice correctly at a custom ratio', () => {
    const r = gen({ iced: true, ratioOverride: 18 })
    expect(r.waterG).toBe(360)
    expect(r.ice.iceG + r.ice.hotWaterG).toBe(360)
  })
})

describe('manual ice fraction', () => {
  const iced = (over: Partial<GenerateInput> = {}) => gen({ iced: true, ...over })

  it('moves the split without moving the total', () => {
    const half = iced({ iceFractionOverride: 0.5 })
    expect(half.waterG).toBe(iced().waterG)
    expect(half.ice.iceG).toBe(160) // half of 320
    expect(half.ice.hotWaterG).toBe(160)
    expect(half.ice.fraction).toBeCloseTo(0.5, 2)
  })

  it('covers published practice from a third to a half', () => {
    expect(iced({ iceFractionOverride: 0.33 }).ice.fraction).toBeCloseTo(0.33, 2)
    expect(iced({ iceFractionOverride: 0.5 }).ice.fraction).toBeCloseTo(0.5, 2)
  })

  it('clamps rather than letting the bed run dry or the ice do nothing', () => {
    expect(iced({ iceFractionOverride: 0.95 }).ice.fraction).toBeCloseTo(0.6, 2)
    expect(iced({ iceFractionOverride: 0.05 }).ice.fraction).toBeCloseTo(0.25, 2)
  })

  it('still pours only the hot side at any fraction', () => {
    for (const f of [0.25, 0.4, 0.5, 0.6]) {
      const r = iced({ iceFractionOverride: f })
      expect(r.pours.at(-1)?.toG, String(f)).toBe(r.ice.hotWaterG)
      expect(r.ice.iceG + r.ice.hotWaterG, String(f)).toBe(r.waterG)
    }
  })

  it('warns when so much water is ice that the bed is starved', () => {
    const starved = iced({ iceFractionOverride: 0.6, ratioOverride: 12 })
    expect(starved.ice.hotRatio).toBeLessThan(8)
    expect(starved.warnings.join(' ')).toMatch(/the bed only sees/i)
    expect(iced().warnings).toEqual([])
  })

  it('is ignored when the brew is not iced', () => {
    const r = gen({ iceFractionOverride: 0.5 })
    expect(r.ice).toEqual({ iceG: 0, hotWaterG: r.waterG, fraction: 0, hotRatio: r.ratio })
  })
})
