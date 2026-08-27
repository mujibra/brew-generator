/**
 * Dial-in hypotheses and scoring rules — PRD 9.2, F4.
 *
 * Rules are data, scored and inspectable, so expert mode can show the whole
 * ranking and the user can disagree with it (PRD F4 R5).
 *
 * ponytail: predicates are functions, which are human-readable and versioned in
 * source but not JSON-serialisable. Build the serialisable DSL only if users
 * actually need to share or edit rule sets.
 */

export type Symptom = 'sour' | 'bitter' | 'thin' | 'muddy' | 'astringent' | 'flat' | 'harshWhenCool'

export type Drawdown = 'fast' | 'normal' | 'slow' | 'stalled'

export type BedAppearance = 'flat' | 'crater' | 'highAndDry' | 'muddyPool' | 'channelled'

export type Evidence = {
  symptom: Symptom
  actualTimeS?: number
  expectedTimeS?: number
  drawdown?: Drawdown
  bed?: BedAppearance
  tdsPct?: number
  eyPct?: number
  daysOffRoast?: number
  waterKhPpm?: number
  agitation?: 'low' | 'medium' | 'high'
  grinderQuality?: 'entry' | 'good' | 'excellent'
}

export type HypothesisId =
  | 'grindTooCoarse'
  | 'grindTooFine'
  | 'channelling'
  | 'ratioTooLoose'
  | 'ratioTooTight'
  | 'tempTooLow'
  | 'tempTooHigh'
  | 'beanTooFresh'
  | 'beanStale'
  | 'waterAlkalinityHigh'
  | 'agitationExcessive'
  | 'grinderDistribution'

export type Hypothesis = {
  id: HypothesisId
  label: string
  /** Knowledge card that explains the mechanism. PRD F4 R6 — never optional. */
  mechanismCardId: string
  /** Cheapest and most reversible first. PRD 9.2 step 3. */
  cost: 1 | 2 | 3 | 4 | 5
  /** How the correction is applied, so the engine can phrase it in user units. */
  lever:
    | { kind: 'grind'; direction: 'finer' | 'coarser'; micronDelta: number }
    | { kind: 'ratio'; direction: 'tighter' | 'looser'; deltaRatio: number }
    | { kind: 'temp'; deltaC: number }
    | { kind: 'technique'; instruction: string }
    | { kind: 'agitation'; direction: 'less' | 'more' }
    | { kind: 'wait'; days: number }
    | { kind: 'replace'; what: string }
    | { kind: 'water'; instruction: string }
  prediction: string
}

export const HYPOTHESES: Record<HypothesisId, Hypothesis> = {
  grindTooCoarse: {
    id: 'grindTooCoarse',
    label: 'Grind is too coarse — under-extracting',
    mechanismCardId: 'extraction/grind-size',
    cost: 1,
    lever: { kind: 'grind', direction: 'finer', micronDelta: 40 },
    prediction: 'Drawdown should lengthen by roughly 20 s and EY rise about 1.5 %.',
  },
  grindTooFine: {
    id: 'grindTooFine',
    label: 'Grind is too fine — over-extracting and clogging',
    mechanismCardId: 'extraction/grind-size',
    cost: 1,
    lever: { kind: 'grind', direction: 'coarser', micronDelta: 40 },
    prediction: 'Drawdown should shorten by roughly 20 s and the astringency should drop first.',
  },
  channelling: {
    id: 'channelling',
    label: 'Uneven bed — channelling, extracting unevenly',
    mechanismCardId: 'extraction/channelling',
    cost: 1,
    lever: {
      kind: 'technique',
      instruction:
        'Level the bed before the first pour, keep pours centred and slower, and swirl once after the bloom instead of stirring.',
    },
    prediction:
      'The cup should stop tasting sour and bitter at once, and the spent bed should sit flat.',
  },
  ratioTooLoose: {
    id: 'ratioTooLoose',
    label: 'Too much water per gram — weak, not under-extracted',
    mechanismCardId: 'extraction/strength-vs-yield',
    cost: 1,
    lever: { kind: 'ratio', direction: 'tighter', deltaRatio: 1 },
    prediction:
      'TDS should rise without changing extraction yield. Body arrives, sourness does not.',
  },
  ratioTooTight: {
    id: 'ratioTooTight',
    label: 'Too little water per gram — heavy and overwhelming',
    mechanismCardId: 'extraction/strength-vs-yield',
    cost: 1,
    lever: { kind: 'ratio', direction: 'looser', deltaRatio: 1 },
    prediction: 'TDS should fall and the cup should open up without losing sweetness.',
  },
  tempTooLow: {
    id: 'tempTooLow',
    label: 'Water too cool for this roast',
    mechanismCardId: 'extraction/temperature',
    cost: 2,
    lever: { kind: 'temp', deltaC: 2 },
    prediction: 'Slightly higher EY and more sweetness, with little change to brew time.',
  },
  tempTooHigh: {
    id: 'tempTooHigh',
    label: 'Water too hot for this roast',
    mechanismCardId: 'extraction/temperature',
    cost: 2,
    lever: { kind: 'temp', deltaC: -3 },
    prediction: 'Harshness should recede while sweetness holds.',
  },
  beanTooFresh: {
    id: 'beanTooFresh',
    label: 'Coffee is still degassing',
    mechanismCardId: 'roast/degassing',
    cost: 4,
    lever: { kind: 'wait', days: 4 },
    prediction: 'A calmer bloom, more even drawdown, and noticeably more sweetness.',
  },
  beanStale: {
    id: 'beanStale',
    label: 'Coffee is stale',
    mechanismCardId: 'roast/staling',
    cost: 4,
    lever: { kind: 'replace', what: 'this bag' },
    prediction: 'Nothing you do to the brew will bring the aromatics back.',
  },
  waterAlkalinityHigh: {
    id: 'waterAlkalinityHigh',
    label: 'Water alkalinity is buffering the acidity flat',
    mechanismCardId: 'water/alkalinity',
    cost: 3,
    lever: {
      kind: 'water',
      instruction: 'Cut your brew water with distilled or RO to roughly halve the alkalinity.',
    },
    prediction: 'Acidity should reappear and the cup should stop tasting chalky.',
  },
  agitationExcessive: {
    id: 'agitationExcessive',
    label: 'Too much agitation — fines migrating and compacting the bed',
    mechanismCardId: 'extraction/agitation',
    cost: 1,
    lever: { kind: 'agitation', direction: 'less' },
    prediction: 'Faster, more even drawdown and less astringency in the finish.',
  },
  grinderDistribution: {
    id: 'grinderDistribution',
    label: 'Grinder is producing too wide a particle distribution',
    mechanismCardId: 'grind/particle-distribution',
    cost: 5,
    lever: { kind: 'replace', what: 'the grinder, or sift out the fines' },
    prediction:
      'Simultaneous sourness and astringency is the signature of a bimodal grind. No brew change fully fixes it.',
  },
}

export type Rule = {
  /** Stable id so an outcome can be attributed to the rule that fired. */
  id: string
  hypothesis: HypothesisId
  weight: number
  why: string
  when: (e: Evidence) => boolean
}

/** Derive drawdown from times when the user did not classify it. */
export function drawdownOf(e: Evidence): Drawdown | undefined {
  if (e.drawdown) return e.drawdown
  if (e.actualTimeS === undefined || e.expectedTimeS === undefined) return undefined
  const r = e.actualTimeS / e.expectedTimeS
  if (r <= 0.75) return 'fast'
  if (r >= 1.6) return 'stalled'
  if (r >= 1.2) return 'slow'
  return 'normal'
}

const UNEVEN_BEDS: BedAppearance[] = ['crater', 'highAndDry', 'channelled']

export const RULES: Rule[] = [
  // --- sour: the disambiguation the whole product hinges on (PRD F4.2) ---
  {
    id: 'sour-fast-drawdown',
    hypothesis: 'grindTooCoarse',
    weight: 10,
    why: 'Sour with a fast drawdown is classic under-extraction from too coarse a grind.',
    when: (e) => e.symptom === 'sour' && drawdownOf(e) === 'fast',
  },
  {
    id: 'sour-slow-drawdown-is-not-coarseness',
    hypothesis: 'channelling',
    weight: 12,
    why: 'Sour despite a long contact time means water bypassed the bed, not that it was too coarse. Grinding finer here makes it worse.',
    when: (e) => e.symptom === 'sour' && ['slow', 'stalled'].includes(drawdownOf(e) ?? ''),
  },
  {
    id: 'sour-uneven-bed',
    hypothesis: 'channelling',
    weight: 8,
    why: 'An uneven spent bed is direct evidence of channelling.',
    when: (e) => e.symptom === 'sour' && !!e.bed && UNEVEN_BEDS.includes(e.bed),
  },
  {
    id: 'sour-normal-drawdown',
    hypothesis: 'grindTooCoarse',
    weight: 5,
    why: 'Sour at a normal drawdown still points at extraction before anything else.',
    when: (e) => e.symptom === 'sour' && drawdownOf(e) === 'normal',
  },
  {
    id: 'sour-no-timing-evidence',
    hypothesis: 'grindTooCoarse',
    weight: 4,
    why: 'Sour with no timing evidence: the cheapest reversible test is a finer grind.',
    when: (e) => e.symptom === 'sour' && drawdownOf(e) === undefined,
  },
  {
    id: 'sour-very-fresh',
    hypothesis: 'beanTooFresh',
    weight: 6,
    why: 'CO2 in very fresh coffee resists wetting and suppresses extraction.',
    when: (e) => e.symptom === 'sour' && e.daysOffRoast !== undefined && e.daysOffRoast <= 3,
  },
  {
    id: 'sour-cool-water',
    hypothesis: 'tempTooLow',
    weight: 3,
    why: 'Low temperature lowers solubility across the board.',
    when: (e) => e.symptom === 'sour',
  },

  // --- bitter / astringent ---
  {
    id: 'bitter-slow-muddy',
    hypothesis: 'grindTooFine',
    weight: 10,
    why: 'Bitter and dry with a long drawdown and a muddy bed is over-extraction driven by fines.',
    when: (e) =>
      ['bitter', 'astringent'].includes(e.symptom) &&
      ['slow', 'stalled'].includes(drawdownOf(e) ?? ''),
  },
  {
    id: 'muddy-pool-bed',
    hypothesis: 'agitationExcessive',
    weight: 9,
    why: 'A muddy pool on top of the bed means fines were driven into the filter.',
    when: (e) => e.bed === 'muddyPool',
  },
  {
    id: 'bitter-high-agitation',
    hypothesis: 'agitationExcessive',
    weight: 7,
    why: 'Heavy agitation raises yield and pushes fines, which shows up as astringency.',
    when: (e) => ['bitter', 'astringent'].includes(e.symptom) && e.agitation === 'high',
  },
  {
    id: 'bitter-normal-drawdown',
    hypothesis: 'grindTooFine',
    weight: 5,
    why: 'Bitterness at a normal drawdown still points at too much yield.',
    when: (e) => ['bitter', 'astringent'].includes(e.symptom) && drawdownOf(e) !== 'fast',
  },
  {
    id: 'bitter-hot-water',
    hypothesis: 'tempTooHigh',
    weight: 4,
    why: 'Hotter water dissolves the bitter, heavy compounds faster than anything else.',
    when: (e) => ['bitter', 'harshWhenCool'].includes(e.symptom),
  },
  {
    id: 'harsh-when-cool',
    hypothesis: 'grindTooFine',
    weight: 8,
    why: 'A cup that is fine hot and harsh cold is slightly over-extracted; heat was masking it.',
    when: (e) => e.symptom === 'harshWhenCool',
  },

  // --- strength, not extraction (PRD F4.2) ---
  {
    id: 'thin-not-sour',
    hypothesis: 'ratioTooLoose',
    weight: 11,
    why: 'Thin without sourness is a strength problem. Grinding finer would over-extract it.',
    when: (e) => e.symptom === 'thin',
  },
  {
    id: 'thin-with-good-ey',
    hypothesis: 'ratioTooLoose',
    weight: 6,
    why: 'A measured EY inside the target band rules out under-extraction, leaving the ratio.',
    when: (e) => e.symptom === 'thin' && e.eyPct !== undefined && e.eyPct >= 18,
  },
  {
    id: 'muddy-heavy',
    hypothesis: 'ratioTooTight',
    weight: 6,
    why: 'Heavy and unclear can simply be too much coffee per litre.',
    when: (e) => e.symptom === 'muddy',
  },
  {
    id: 'muddy-fines',
    hypothesis: 'agitationExcessive',
    weight: 7,
    why: 'Muddiness usually arrives with fines in suspension.',
    when: (e) => e.symptom === 'muddy',
  },

  // --- flat / dull ---
  {
    id: 'flat-high-alkalinity',
    hypothesis: 'waterAlkalinityHigh',
    weight: 12,
    why: 'Alkalinity buffers the acids that make a cup taste alive. Above about 70 ppm it flattens everything.',
    when: (e) => e.symptom === 'flat' && (e.waterKhPpm ?? 0) > 70,
  },
  {
    id: 'flat-old-coffee',
    hypothesis: 'beanStale',
    weight: 10,
    why: 'Aromatics oxidise away well before sweetness does, which reads as dull.',
    when: (e) => e.symptom === 'flat' && (e.daysOffRoast ?? 0) > 35,
  },
  {
    id: 'flat-correct-ey',
    hypothesis: 'waterAlkalinityHigh',
    weight: 7,
    why: 'Flat at a correct extraction yield is not an extraction problem.',
    when: (e) => e.symptom === 'flat' && e.eyPct !== undefined && e.eyPct >= 18 && e.eyPct <= 22,
  },
  {
    id: 'flat-cool-water',
    hypothesis: 'tempTooLow',
    weight: 5,
    why: 'Under-temperature brewing reads as dull rather than sour on darker roasts.',
    when: (e) => e.symptom === 'flat',
  },

  // --- simultaneous opposites: the grinder tell ---
  {
    id: 'sour-and-astringent-together',
    hypothesis: 'grinderDistribution',
    weight: 6,
    why: 'Sour and astringent in the same cup means part of the bed under-extracted while part over-extracted.',
    when: (e) => e.symptom === 'astringent' && e.bed === 'channelled',
  },
  {
    id: 'entry-grinder-astringent',
    hypothesis: 'grinderDistribution',
    weight: 3,
    why: 'Entry-level burrs generate more fines, which caps how clean the cup can get.',
    when: (e) => ['astringent', 'muddy'].includes(e.symptom) && e.grinderQuality === 'entry',
  },
]
