/**
 * Water as a brewing lever — PRD 8.6, F7.
 *
 * The app has had a whole water surface since early on and the recipe
 * generator never read a single number from it. That was the largest gap in
 * the model: water is 98.5 % of the cup and it is not a passive solvent.
 *
 * Two independent numbers, doing two different jobs:
 *
 * **Hardness (GH)** is part of the extraction mechanism. Magnesium and calcium
 * ions bind coffee's flavour compounds and pull them into solution — Hendon
 * and Colonna-Dashwood found Mg²⁺ binds the malic, lactic and citric acids
 * more strongly than Ca²⁺ does, which is why magnesium-weighted water reads as
 * brighter. Soft water extracts less at the same grind; hard water extracts
 * more. So the grind has to move to meet it.
 *
 * **Alkalinity (KH)** does not help extraction at all. It neutralises the acids
 * on the way out. Their formulation is blunt about it: perceived acidity is
 * what was extracted minus what the water buffers away. Grinding cannot undo
 * that — the acid is extracted and then destroyed — so this reports a warning
 * and nudges temperature rather than pretending a lever exists.
 *
 * SCA targets: GH 68 ppm as CaCO₃ (acceptable 17–85), KH 40 ppm (acceptable
 * 40–75).
 *
 * ponytail: two thresholds and a subtraction, not a model of ion chemistry.
 * The water lab already does the chemistry; this only has to decide how far to
 * move the grind and what to tell the user.
 */

export type BrewWater = {
  /** General hardness, ppm as CaCO₃. */
  ghPpmCaCO3: number
  /** Alkalinity / carbonate hardness, ppm as CaCO₃. */
  khPpmCaCO3: number
}

/** The reference point every offset below is measured from. */
export const WATER_REFERENCE: BrewWater = { ghPpmCaCO3: 68, khPpmCaCO3: 40 }

export type WaterAdvice = {
  /** Added to the target grind, in microns. Positive is coarser. */
  micronOffset: number
  /** Added to the brew temperature, in °C. */
  tempOffsetC: number
  /** Lines for the rationale. Always at least one. */
  lines: string[]
  /** Problems worth interrupting for. */
  warnings: string[]
  /** Short summary for the rationale heading. */
  value: string
}

/**
 * Hardness drives extraction, so the grind has to move against it: soft water
 * needs a finer grind to reach the same yield, hard water needs a coarser one
 * to avoid overshooting.
 *
 * The steps are deliberately coarse. Nobody's tap water is stable enough to
 * justify a continuous curve, and a 20 µm claim on a ±30 ppm measurement would
 * be false precision.
 */
function hardnessMicronOffset(gh: number): { offset: number; line: string } {
  if (gh < 25) {
    return {
      offset: -40,
      line: `${Math.round(gh)} ppm is very soft. There is little in the water to carry flavour compounds out of the grounds, so the same grind extracts less — this grinds finer to compensate. Adding minerals would work better than chasing it with the grinder.`,
    }
  }
  if (gh < 50) {
    return {
      offset: -20,
      line: `${Math.round(gh)} ppm is on the soft side of the SCA range, so extraction runs a little short at any given grind. Ground slightly finer for it.`,
    }
  }
  if (gh > 150) {
    return {
      offset: 40,
      line: `${Math.round(gh)} ppm is hard. Hard water extracts aggressively, and at your usual grind that lands as bitterness and drying rather than as more flavour — this grinds coarser to hold the yield down.`,
    }
  }
  if (gh > 100) {
    return {
      offset: 20,
      line: `${Math.round(gh)} ppm is above the SCA range and pulls harder than the reference water, so this grinds slightly coarser.`,
    }
  }
  return {
    offset: 0,
    line: `${Math.round(gh)} ppm is inside the SCA range, so the grind is left where the coffee put it.`,
  }
}

export function waterAdvice(water: BrewWater | undefined): WaterAdvice | undefined {
  if (!water) return undefined
  const { ghPpmCaCO3: gh, khPpmCaCO3: kh } = water
  if (!Number.isFinite(gh) || !Number.isFinite(kh) || gh < 0 || kh < 0) return undefined

  const hardness = hardnessMicronOffset(gh)
  const lines = [hardness.line]
  const warnings: string[] = []
  let tempOffsetC = 0

  if (kh > 70) {
    // Alkalinity subtracts from perceived acidity after extraction, so no
    // grind change recovers it. Say so plainly instead of moving a lever that
    // cannot reach.
    warnings.push(
      `Your alkalinity is ${Math.round(kh)} ppm. Above about 70 the water neutralises coffee acids as fast as they are extracted, and the cup tastes flat however well you brew — perceived acidity is what you extracted minus what the water buffers away. No grind setting fixes this. Cut the water with distilled, or build it from scratch in the water lab.`,
    )
    // Heat brings out more of everything, which is the only compensation left.
    tempOffsetC = 1
    lines.push(
      `${Math.round(kh)} ppm of alkalinity is buffering the acidity away after you extract it. The extra degree recovers a little of what is lost, but this is a water problem and wants a water fix.`,
    )
  } else if (kh < 20) {
    warnings.push(
      `Alkalinity of ${Math.round(kh)} ppm is very low. With almost no buffer the cup can read sharp and thin rather than bright, and a small brewing error shows up as sourness with nothing to soften it.`,
    )
    lines.push(
      `${Math.round(kh)} ppm leaves the acids unbuffered, so everything acidic in this coffee arrives at full volume.`,
    )
  } else {
    lines.push(
      `${Math.round(kh)} ppm of alkalinity is in range: enough buffer to keep the cup from reading sharp, not enough to flatten it.`,
    )
  }

  // The 2:1 GH:KH relationship Hendon and Colonna-Dashwood land on.
  const ratio = kh > 0 ? gh / kh : Number.POSITIVE_INFINITY
  if (kh >= 20 && kh <= 70 && (ratio < 1.2 || ratio > 3)) {
    lines.push(
      `Hardness to alkalinity is about ${ratio.toFixed(1)}:1. Roughly 2:1 is the balance most brewing water aims at — ${
        ratio < 1.2
          ? 'yours is buffer-heavy, which mutes acidity for the amount of extraction power it gives you'
          : 'yours is hardness-heavy, which extracts hard with little to soften the result'
      }.`,
    )
  }

  return {
    micronOffset: hardness.offset,
    tempOffsetC,
    lines,
    warnings,
    value: `${Math.round(gh)} ppm GH · ${Math.round(kh)} ppm KH`,
  }
}
