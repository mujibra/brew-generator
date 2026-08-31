/**
 * Processing method as a brewing lever — PRD 8.4.
 *
 * How the cherry was processed changes what is in the bean before anyone
 * roasts it, and the difference is large enough that ignoring it while
 * carefully modelling altitude was indefensible. Two beans of the same origin,
 * altitude and roast level want different water temperatures if one is washed
 * and the other is natural.
 *
 * The mechanism, briefly: the mucilage left on the seed during drying ferments
 * against it. Washed coffees have it stripped before drying, so what reaches
 * the cup is the seed's own acidity and little else. Naturals dry inside the
 * whole fruit and take on fermentation-derived sugars and aromatics that are
 * both more soluble and easier to push into ferment-tasting territory, so they
 * are brewed cooler and coarser. Honey is the continuum between the two, and
 * anaerobic is a controlled fermentation that concentrates the same volatile
 * compounds further still.
 *
 * ponytail: offsets from the same base as every other lever, so the rationale
 * can report them the same way. Nothing fitted, nothing hidden.
 */

export type ProcessId = 'washed' | 'honey' | 'natural' | 'anaerobic'

export type ProcessMethod = {
  id: ProcessId
  label: string
  /** One line, for the picker. */
  blurb: string
  /** Added to the goal's ratio. Positive is more water per gram. */
  ratioOffset: number
  /** Added to the temperature the roast level asks for, in °C. */
  tempOffsetC: number
  /** Added to the target grind, in microns. Positive is coarser. */
  micronOffset: number
  /** What to expect in the cup, for the rationale. */
  character: string
  /** Why the offsets are what they are. */
  why: string
  /** Shown when the method needs a technique change, not just a number change. */
  technique?: string
}

export const PROCESSES: ProcessMethod[] = [
  {
    id: 'washed',
    label: 'Washed',
    blurb: 'Mucilage stripped before drying. Clean, and the origin shows through.',
    ratioOffset: 0,
    tempOffsetC: 1,
    micronOffset: -10,
    character: 'High clarity, defined acidity, medium sweetness, lighter body.',
    why: 'Nothing ferments against the seed, so the sugars that would have made extraction easy are not there. Washed coffees take heat and a finer grind without turning muddy, and usually need them to give up their sweetness.',
  },
  {
    id: 'honey',
    label: 'Honey',
    blurb: 'Skin off, mucilage left on to dry. Between washed and natural.',
    ratioOffset: 0.25,
    tempOffsetC: 0,
    micronOffset: 0,
    character: 'Balanced sweetness and clarity, medium body.',
    why: 'The mucilage left on during drying gives soluble sweetness that arrives early, so the baseline works as-is. Yellow honey behaves closer to washed, black honey closer to natural — move a step in that direction if the bag says which.',
  },
  {
    id: 'natural',
    label: 'Natural',
    blurb: 'Dried inside the whole cherry. Fruit-forward and heavier.',
    ratioOffset: 0.5,
    tempOffsetC: -3,
    micronOffset: 30,
    character: 'Emphasised sweetness — berry, ripe fruit — and strong body.',
    why: 'Fermentation-derived sugars and aromatics dissolve early and readily. Push them and fruit turns to ferment and boozy heaviness, so this brews cooler, coarser and with slightly more water per gram. The restraint is the recipe.',
    technique:
      'Pour gently and keep agitation low. A natural punished by a hard pour tastes overripe rather than fruity.',
  },
  {
    id: 'anaerobic',
    label: 'Anaerobic / experimental',
    blurb: 'Sealed fermentation. Intense, wine-like, and easy to overcook.',
    ratioOffset: 0.5,
    tempOffsetC: -4,
    micronOffset: 40,
    character: 'Intense aromatics: wine-like, spiced, tropical. Polarising by design.',
    why: 'A controlled low-oxygen ferment concentrates exactly the volatile compounds that go vinegary and astringent when over-extracted. Start cooler and coarser than you think, and walk it back only if the cup tastes hollow.',
    technique:
      'Minimise agitation. These are the coffees where a gentle pour is worth more than any other adjustment.',
  },
]

export const PROCESS_BY_ID: Record<ProcessId, ProcessMethod> = Object.fromEntries(
  PROCESSES.map((p) => [p.id, p]),
) as Record<ProcessId, ProcessMethod>

/**
 * Bags say "natural anaerobic", "washed process", "red honey", "carbonic
 * maceration". The shelf stores whatever the user typed, so the generator has
 * to read it rather than demand a dropdown was used.
 *
 * Order matters: an anaerobic natural is brewed as an anaerobic, because the
 * sealed ferment is the dominant fact about it.
 */
export function processFromText(text: string | undefined): ProcessId | undefined {
  if (!text) return undefined
  const t = text.toLowerCase()
  if (/anaerobic|carbonic|maceration|co2|yeast|inocul|experimental|lactic/.test(t)) {
    return 'anaerobic'
  }
  if (/honey|pulped natural|miel|semi-?washed/.test(t)) return 'honey'
  if (/natural|dry.?process|unwashed/.test(t)) return 'natural'
  if (/washed|wet.?process|fully washed|lavado/.test(t)) return 'washed'
  return undefined
}
