/**
 * Grinder registry — PRD F6.1.
 *
 * Every micron-per-unit figure here is an estimate with a confidence rating, and
 * the UI must never render one as exact (PRD F6 R1). The reliable path is always
 * the user's own baseline plus a delta (F6 R3); absolute microns are the
 * fallback for someone who has not set one yet.
 */

export type GrinderConfidence = 'measured' | 'community' | 'estimated'

export type Grinder = {
  id: string
  name: string
  burrType: 'conical' | 'flat'
  hand: boolean
  /** What the adjustment is called on this grinder. */
  unitLabel: string
  micronsPerUnit: number
  confidence: GrinderConfidence
  /** Typical filter range in the grinder's own units, for sanity checks. */
  filterRange?: { min: number; max: number }
  note?: string
}

export const GRINDERS: Grinder[] = [
  {
    id: 'comandante-c40',
    name: 'Comandante C40',
    burrType: 'conical',
    hand: true,
    unitLabel: 'clicks',
    micronsPerUnit: 30,
    confidence: 'community',
    filterRange: { min: 22, max: 32 },
    note: 'Widely reported around 30 µm per click. Red Clix triples the resolution.',
  },
  {
    id: '1zpresso-jx-pro',
    name: '1Zpresso JX-Pro',
    burrType: 'conical',
    hand: true,
    unitLabel: 'clicks',
    micronsPerUnit: 12.5,
    confidence: 'measured',
    filterRange: { min: 40, max: 70 },
    note: 'Manufacturer states 12.5 µm per click, 10 clicks per rotation.',
  },
  {
    id: '1zpresso-j-ultra',
    name: '1Zpresso J-Ultra',
    burrType: 'conical',
    hand: true,
    unitLabel: 'clicks',
    micronsPerUnit: 12.5,
    confidence: 'measured',
    filterRange: { min: 40, max: 70 },
  },
  {
    id: '1zpresso-k-ultra',
    name: '1Zpresso K-Ultra',
    burrType: 'conical',
    hand: true,
    unitLabel: 'clicks',
    micronsPerUnit: 22,
    confidence: 'measured',
    filterRange: { min: 24, max: 42 },
  },
  {
    id: '1zpresso-zp6',
    name: '1Zpresso ZP6',
    burrType: 'conical',
    hand: true,
    unitLabel: 'clicks',
    micronsPerUnit: 25,
    confidence: 'measured',
    filterRange: { min: 20, max: 34 },
    note: 'Filter-dedicated burrs: very few fines, so it tolerates a finer setting than most.',
  },
  {
    id: 'timemore-c2',
    name: 'Timemore C2 / C3',
    burrType: 'conical',
    hand: true,
    unitLabel: 'clicks',
    micronsPerUnit: 33,
    confidence: 'community',
    filterRange: { min: 18, max: 28 },
  },
  {
    id: 'timemore-s3',
    name: 'Timemore Chestnut S3',
    burrType: 'conical',
    hand: true,
    unitLabel: 'clicks',
    micronsPerUnit: 15,
    confidence: 'community',
    filterRange: { min: 38, max: 64 },
    note: 'S2C burrs, external adjustment. 15 µm per click gives fine control — a one-click change is a small move, so expect to adjust in threes and fours rather than singles.',
  },
  {
    id: 'kingrinder-k6',
    name: 'Kingrinder K6',
    burrType: 'conical',
    hand: true,
    unitLabel: 'clicks',
    micronsPerUnit: 16,
    confidence: 'community',
    filterRange: { min: 35, max: 60 },
  },
  {
    id: 'baratza-encore',
    name: 'Baratza Encore',
    burrType: 'conical',
    hand: false,
    unitLabel: 'steps',
    micronsPerUnit: 40,
    confidence: 'estimated',
    filterRange: { min: 14, max: 24 },
    note: 'Stepped and fairly coarse per step, so fine adjustment is limited.',
  },
  {
    id: 'fellow-ode-2',
    name: 'Fellow Ode Gen 2',
    burrType: 'flat',
    hand: false,
    unitLabel: 'marks',
    micronsPerUnit: 55,
    confidence: 'estimated',
    filterRange: { min: 3, max: 8 },
    note: 'Flat burrs: a narrower particle spread, so it can run coarser at the same yield.',
  },
  {
    id: 'wilfa-uniform',
    name: 'Wilfa Uniform',
    burrType: 'flat',
    hand: false,
    unitLabel: 'marks',
    micronsPerUnit: 30,
    confidence: 'estimated',
  },
  {
    id: 'df64',
    name: 'DF64',
    burrType: 'flat',
    hand: false,
    unitLabel: 'marks',
    micronsPerUnit: 45,
    confidence: 'estimated',
  },
  {
    id: 'other',
    name: 'Something else',
    burrType: 'conical',
    hand: true,
    unitLabel: 'clicks',
    micronsPerUnit: 0,
    confidence: 'estimated',
    note: 'Without a micron figure the app stays in relative terms, which is more honest anyway.',
  },
]

export function grinderById(id: string): Grinder | undefined {
  return GRINDERS.find((g) => g.id === id)
}

export type GrindAdvice = {
  /** Target median particle size the recipe wants. */
  targetMicrons: number
  /** Uncertainty on the setting, in the grinder's own units. */
  uncertaintyUnits: number
  /** Absolute setting, only when the grinder has a credible micron figure. */
  settingUnits?: number
  /** Offset from the user's own baseline — always preferred when available. */
  deltaFromBaseline?: number
  text: string
  caveat: string
}

/**
 * Turn a micron target into something the user can act on.
 *
 * Prefers a delta from their own baseline (PRD F6 R3) because absolute micron
 * claims across grinders are not trustworthy enough to state flatly.
 */
export function grindAdvice(
  grinder: Grinder,
  targetMicrons: number,
  baselineSetting?: number,
  baselineMicrons?: number,
): GrindAdvice {
  const confidenceCaveat: Record<GrinderConfidence, string> = {
    measured: 'Based on the published step size — a starting point, not a guarantee.',
    community: 'Based on community measurements, which vary between units.',
    estimated: 'An estimate only. Trust your own baseline over this number.',
  }

  if (grinder.micronsPerUnit <= 0) {
    return {
      targetMicrons,
      uncertaintyUnits: 0,
      text: `Aim for a ${describeGrind(targetMicrons)} grind.`,
      caveat:
        'No reliable step size for this grinder, so this stays descriptive. Set a baseline once you find a setting you like and the app will work in deltas from it.',
    }
  }

  const uncertaintyUnits = Math.max(1, Math.round(30 / grinder.micronsPerUnit))

  // Anchored delta: far more reliable than an absolute micron claim.
  if (baselineSetting !== undefined && baselineMicrons !== undefined) {
    const delta = Math.round((targetMicrons - baselineMicrons) / grinder.micronsPerUnit)
    const setting = baselineSetting + delta
    return {
      targetMicrons,
      uncertaintyUnits,
      settingUnits: setting,
      deltaFromBaseline: delta,
      text:
        delta === 0
          ? `Your usual ${baselineSetting} ${grinder.unitLabel}.`
          : `${setting} ${grinder.unitLabel} — that is ${Math.abs(delta)} ${grinder.unitLabel} ${delta > 0 ? 'coarser' : 'finer'} than your usual ${baselineSetting}.`,
      caveat: 'Anchored to your own baseline, which is the most reliable way to express this.',
    }
  }

  const setting = Math.round(targetMicrons / grinder.micronsPerUnit)
  const range = grinder.filterRange
  const outOfRange = range && (setting < range.min || setting > range.max)

  return {
    targetMicrons,
    uncertaintyUnits,
    settingUnits: setting,
    text: `About ${setting} ${grinder.unitLabel}, give or take ${uncertaintyUnits} (${describeGrind(targetMicrons)}, roughly ${targetMicrons} µm).`,
    caveat: outOfRange
      ? `${confidenceCaveat[grinder.confidence]} This also sits outside the ${range.min}-${range.max} ${grinder.unitLabel} most people use for filter on this grinder, so treat it with suspicion.`
      : confidenceCaveat[grinder.confidence],
  }
}

export function describeGrind(microns: number): string {
  if (microns < 500) return 'fine, like table salt'
  if (microns < 650) return 'medium-fine, finer than sea salt'
  if (microns < 800) return 'medium, like coarse sea salt'
  if (microns < 950) return 'medium-coarse'
  return 'coarse, like raw sugar'
}
