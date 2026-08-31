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
 * are brewed cooler and coarser. Everything else is a position on that line, or
 * a deliberate intervention in the microbiology that drives it.
 *
 * Two structural decisions:
 *
 * 1. **Families, then variants.** Eighteen flat options is not a picker. Honey
 *    is one choice with four positions on the washed-to-natural continuum;
 *    experimental fermentation is one choice with seven. The offsets live on
 *    the variant, because that is where the difference is.
 *
 * 2. **Decaf is not a process.** It is orthogonal — a decaf can be washed or
 *    natural — so it is a separate flag rather than an eighteenth id. Modelling
 *    it as a process would have made "washed decaf" unrepresentable.
 *
 * ponytail: offsets from the same base as every other lever, so the rationale
 * can report them the same way. Nothing fitted, nothing hidden.
 */

export type ProcessFamilyId = 'washed' | 'honey' | 'natural' | 'ferment' | 'other'

export type ProcessId =
  // Washed
  | 'washed'
  | 'washedDouble'
  | 'wetHulled'
  // Honey, by how much mucilage stays on the parchment
  | 'honeyWhite'
  | 'honeyYellow'
  | 'honeyRed'
  | 'honeyBlack'
  // Natural
  | 'natural'
  | 'naturalExtended'
  // Controlled fermentation
  | 'anaerobicWashed'
  | 'anaerobicNatural'
  | 'carbonicMaceration'
  | 'lactic'
  | 'thermalShock'
  | 'yeastInoculated'
  | 'coFerment'
  | 'koji'
  // Neither a ferment nor a drying choice
  | 'monsooned'

export type ProcessMethod = {
  id: ProcessId
  family: ProcessFamilyId
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
  /**
   * How confident the offsets are. The classical three are well documented;
   * the experimental ferments are a moving target and are marked as such.
   */
  confidence: 'established' | 'emerging'
}

export const PROCESS_FAMILIES: {
  id: ProcessFamilyId
  label: string
  blurb: string
}[] = [
  {
    id: 'washed',
    label: 'Washed',
    blurb: 'Mucilage removed before drying. The seed, and not much else.',
  },
  {
    id: 'honey',
    label: 'Honey',
    blurb: 'Skin off, some mucilage left on to dry. A continuum, not a method.',
  },
  { id: 'natural', label: 'Natural', blurb: 'Dried inside the whole cherry.' },
  {
    id: 'ferment',
    label: 'Controlled ferment',
    blurb: 'Someone intervened in the microbiology on purpose.',
  },
  { id: 'other', label: 'Other', blurb: 'Neither a ferment nor a drying choice.' },
]

export const PROCESSES: ProcessMethod[] = [
  // --- Washed ---------------------------------------------------------------
  {
    id: 'washed',
    family: 'washed',
    label: 'Washed',
    blurb: 'Depulped, fermented 12–48 h in tank, washed clean, then dried.',
    ratioOffset: 0,
    tempOffsetC: 1,
    micronOffset: -10,
    character: 'High clarity, defined acidity, medium sweetness, lighter body.',
    why: 'Nothing ferments against the seed, so the sugars that would have made extraction easy are not there. Washed coffees take heat and a finer grind without turning muddy, and usually need them to give up their sweetness.',
    confidence: 'established',
  },
  {
    id: 'washedDouble',
    family: 'washed',
    label: 'Double washed / Kenyan',
    blurb: 'Two ferments with a soak between. The classic Kenya method.',
    ratioOffset: 0,
    tempOffsetC: 1,
    micronOffset: -15,
    character:
      'Washed clarity taken further — blackcurrant, tomato, savoury depth, and a hard, structural acidity.',
    why: 'Two fermentations of 12–72 h with a clean-water soak between them strip the mucilage more completely than a single pass, so there is even less easy sweetness in the seed. This wants the finest and hottest of the washed treatments to keep the acidity from reading as sour rather than structural.',
    confidence: 'established',
  },
  {
    id: 'wetHulled',
    family: 'washed',
    label: 'Wet-hulled (giling basah)',
    blurb: 'Parchment hulled at 20–40 % moisture. Sumatra and Sulawesi.',
    ratioOffset: -0.5,
    tempOffsetC: 0,
    micronOffset: 30,
    character: 'Low acidity, very heavy body, earthy and cedar-like. Woody, savoury, unmistakable.',
    why: 'The parchment comes off while the bean is still wet and it finishes drying naked, which is why these are physically softer and extract faster than a normal washed coffee. Coarser keeps the cup out of muddy territory, and a tighter ratio plays to a coffee whose whole appeal is body rather than brightness.',
    technique:
      'These reward immersion. A French press or a Switch gives the body more room than a cone does, and there is little acidity for a cone to separate out.',
    confidence: 'established',
  },

  // --- Honey, by mucilage retained -----------------------------------------
  {
    id: 'honeyWhite',
    family: 'honey',
    label: 'White honey',
    blurb: '80–100 % of the mucilage removed. Nearly washed.',
    ratioOffset: 0,
    tempOffsetC: 1,
    micronOffset: -5,
    character: 'Light and clean, with a touch more sweetness than washed.',
    why: 'Almost all the mucilage is gone, so this behaves like a washed coffee with slightly more to give. Treat it as washed and back off only if it turns heavy.',
    confidence: 'established',
  },
  {
    id: 'honeyYellow',
    family: 'honey',
    label: 'Yellow honey',
    blurb: 'Around 25 % of the mucilage left on. Short, fast drying.',
    ratioOffset: 0.25,
    tempOffsetC: 0,
    micronOffset: 0,
    character: 'Balanced sweetness with delicate floral or fruity aromatics.',
    why: 'A quarter of the mucilage dried against the seed, which is enough soluble sweetness to arrive early without dominating. This is the middle of the whole processing range, so it sits on the baseline.',
    confidence: 'established',
  },
  {
    id: 'honeyRed',
    family: 'honey',
    label: 'Red honey',
    blurb: 'About 50 % left on, dried slower and in more shade.',
    ratioOffset: 0.25,
    tempOffsetC: -1,
    micronOffset: 10,
    character: 'Rounder sweetness, more stone fruit, noticeably more body than yellow.',
    why: 'Half the mucilage and a slower dry means real fermentation time against the seed. Enough that heat starts to work against you.',
    confidence: 'established',
  },
  {
    id: 'honeyBlack',
    family: 'honey',
    label: 'Black honey',
    blurb: '75–100 % left on, dried longest. Nearly natural.',
    ratioOffset: 0.5,
    tempOffsetC: -2,
    micronOffset: 20,
    character: 'Heavy, syrupy, jammy. Closer to a natural than to a washed.',
    why: 'Essentially all the mucilage, dried over the longest period of any honey, so the fermentation character is the dominant flavour. Brew it like a natural you are slightly less worried about.',
    technique:
      'Keep agitation moderate. The sweetness is already there and does not need to be pulled out.',
    confidence: 'established',
  },

  // --- Natural --------------------------------------------------------------
  {
    id: 'natural',
    family: 'natural',
    label: 'Natural',
    blurb: 'Whole cherry dried on beds or patio, up to four weeks.',
    ratioOffset: 0.5,
    tempOffsetC: -3,
    micronOffset: 30,
    character: 'Emphasised sweetness — berry, ripe fruit — and strong body.',
    why: 'Fermentation-derived sugars and aromatics dissolve early and readily. Push them and fruit turns to ferment and boozy heaviness, so this brews cooler, coarser and with slightly more water per gram. The restraint is the recipe.',
    technique:
      'Pour gently and keep agitation low. A natural punished by a hard pour tastes overripe rather than fruity.',
    confidence: 'established',
  },
  {
    id: 'naturalExtended',
    family: 'natural',
    label: 'Extended / raisin natural',
    blurb: 'Cherries left to raisin on the tree or in a long slow dry.',
    ratioOffset: 0.5,
    tempOffsetC: -4,
    micronOffset: 40,
    character: 'Dried fruit, rum, date. Sweetness past ripe and into preserved.',
    why: 'More time in contact with fermenting fruit means more of the same compounds a natural has, further along. Everything that makes a natural need restraint needs more of it here.',
    technique: 'Gentle pour, and taste early — the window between raisin and boozy is narrow.',
    confidence: 'emerging',
  },

  // --- Controlled fermentation ---------------------------------------------
  {
    id: 'anaerobicWashed',
    family: 'ferment',
    label: 'Anaerobic washed',
    blurb: 'Depulped, then sealed in a tank with a valve to off-gas.',
    ratioOffset: 0.25,
    tempOffsetC: -2,
    micronOffset: 20,
    character:
      'Washed clarity with precise, oddly specific notes — cinnamon, licorice, poached pear.',
    why: 'Sealing the tank starves the spoilage organisms of oxygen and lets chosen yeasts and lactic bacteria dominate, but the fruit is already off, so there is far less sugar involved than in a sealed natural. Half a step of restraint, not a full one.',
    confidence: 'emerging',
  },
  {
    id: 'anaerobicNatural',
    family: 'ferment',
    label: 'Anaerobic natural',
    blurb: 'Whole cherry sealed in a tank, then dried in the fruit.',
    ratioOffset: 0.5,
    tempOffsetC: -4,
    micronOffset: 40,
    character: 'Intense and polarising: wine, spice, tropical fruit, bubblegum.',
    why: 'A sealed ferment on top of a natural concentrates exactly the volatile compounds that go vinegary and astringent when over-extracted. Start cooler and coarser than you think, and walk it back only if the cup tastes hollow.',
    technique:
      'Minimise agitation. These are the coffees where a gentle pour is worth more than any other adjustment.',
    confidence: 'emerging',
  },
  {
    id: 'carbonicMaceration',
    family: 'ferment',
    label: 'Carbonic maceration',
    blurb: 'Whole cherry in a tank actively flooded with CO₂. Days to weeks.',
    ratioOffset: 0.5,
    tempOffsetC: -4,
    micronOffset: 40,
    character: 'Ripe berry and grape into dried date, browned butter and maple.',
    why: 'The strictest form of anaerobic: the cherry stays intact and the oxygen is actively displaced with carbon dioxide rather than merely excluded, which steers the microbes more precisely and runs for days or weeks. The result is the most concentrated ferment character of any method here, and the same fragility as an anaerobic natural.',
    technique:
      'Gentle pour, low agitation. Anything that raises early extraction raises the ferment first.',
    confidence: 'emerging',
  },
  {
    id: 'lactic',
    family: 'ferment',
    label: 'Lactic',
    blurb: 'Fermentation steered toward lactic acid bacteria, low pH.',
    ratioOffset: 0.5,
    tempOffsetC: -3,
    micronOffset: 30,
    character: 'Creamy, yoghurt-like acidity and a thick, dairy mouthfeel.',
    why: 'Lactic acid bacteria are allowed to dominate, which lowers the pH and shifts the acid profile from sharp toward round. The mouthfeel arrives early in extraction and the sourness arrives if you push it, so this stays cool and a touch coarse.',
    confidence: 'emerging',
  },
  {
    id: 'thermalShock',
    family: 'ferment',
    label: 'Thermal shock',
    blurb: 'Heated in its own juices to 40–50 °C, then shocked cold at 10 °C.',
    ratioOffset: 0.5,
    tempOffsetC: -4,
    micronOffset: 40,
    character:
      'Extremely aromatic and clean for how intense it is — the Finca El Paraíso signature.',
    why: 'After a long sealed ferment the coffee is heated in its own juices so the pores open and take up aromatic esters, then rinsed cold so the pores close and lock them in. Those absorbed aromatics sit in the most accessible fraction of the bean, so the early part of the brew carries most of them and a hot, fine brew simply overshoots.',
    technique:
      'Gentle, and do not chase more extraction. If it tastes hollow, tighten the ratio rather than grinding finer.',
    confidence: 'emerging',
  },
  {
    id: 'yeastInoculated',
    family: 'ferment',
    label: 'Yeast inoculated',
    blurb: 'A chosen yeast strain added, borrowed from beer and wine.',
    ratioOffset: 0.25,
    tempOffsetC: -2,
    micronOffset: 20,
    character: 'Direction depends entirely on the strain — often floral, tropical or wine-like.',
    why: 'Adding a known strain makes the ferment faster and far more repeatable than leaving it to whatever is on the fruit, but it adds no new sugar. So this needs less restraint than a co-ferment: half a step, and let the cup tell you the rest.',
    confidence: 'emerging',
  },
  {
    id: 'coFerment',
    family: 'ferment',
    label: 'Co-ferment / infused',
    blurb: 'Fruit pulp, must or cacao added to the tank during fermentation.',
    ratioOffset: 0.5,
    tempOffsetC: -4,
    micronOffset: 40,
    character: 'Whatever went in, loudly. Strawberry, lychee, cinnamon. Divisive by design.',
    why: 'Unlike a yeast inoculation, this adds substrate — new sugars and new flavour compounds that were never in the coffee. There is more that dissolves easily than in any other method here, which makes over-extraction both the easiest mistake and the ugliest.',
    technique:
      'Coolest and coarsest of the ferments, and pour gently. Push one of these and it tastes like cough syrup.',
    confidence: 'emerging',
  },
  {
    id: 'koji',
    family: 'ferment',
    label: 'Koji',
    blurb: 'Aspergillus oryzae grown on the cherry or parchment, with oxygen.',
    ratioOffset: 0.25,
    tempOffsetC: -2,
    micronOffset: 20,
    character: 'Savoury depth and umami-like sweetness, heavier body, soy and miso edges.',
    why: 'The mould secretes protease, which breaks proteins into amino acids and reads as body and savoury sweetness, and amylase, which turns starch into fermentable sugar for whatever ferments next. Unlike the anaerobic methods this one needs oxygen, and the character it adds is body rather than acidity — so the restraint is smaller and aimed at not muddying it.',
    confidence: 'emerging',
  },

  // --- Other ---------------------------------------------------------------
  {
    id: 'monsooned',
    family: 'other',
    label: 'Monsooned',
    blurb: 'Green coffee exposed to monsoon air for months. Malabar, India.',
    ratioOffset: -1,
    tempOffsetC: 0,
    micronOffset: 30,
    character: 'Near-zero acidity, huge body, soil, nuts and spice. Pale, swollen beans.',
    why: 'Three to four months of monsoon humidity swells the beans, strips most of their acidity and drops their density by 40–60 %. A far less dense bean gives up its solubles readily, so this grinds coarser, and with almost no acidity to frame there is no point brewing it light — a tighter ratio plays to the body that is actually there.',
    technique:
      'Built for immersion. A French press or a long steep amplifies the body; a cone spends its effort separating notes that monsooning removed.',
    confidence: 'established',
  },
]

export const PROCESS_BY_ID: Record<ProcessId, ProcessMethod> = Object.fromEntries(
  PROCESSES.map((p) => [p.id, p]),
) as Record<ProcessId, ProcessMethod>

export const PROCESSES_BY_FAMILY = (family: ProcessFamilyId): ProcessMethod[] =>
  PROCESSES.filter((p) => p.family === family)

/**
 * Decaffeination — orthogonal to everything above, because a decaf can be
 * washed or natural or anything else.
 *
 * Decaffeination swells the bean and leaves it more porous and less dense, so
 * water moves through faster and the margin before bitterness dominates is
 * narrower. Coarser, and a touch cooler.
 *
 * The direction is contested: some guides say grind *finer* because decaf
 * tastes flat. That advice treats the symptom — flat usually means the roast
 * was applied to decaf without adjustment — and grinding into a bean that
 * already extracts fast is how flat becomes flat and astringent. The offset
 * here follows the structural argument, and the Learn card says the
 * disagreement exists.
 */
export const DECAF_OFFSETS = { micronOffset: 25, tempOffsetC: -2 }

export const DECAF_WHY =
  'Decaffeination swells the seed and leaves it more porous and less dense, so water moves through it faster than through the caffeinated version of the same coffee and the margin before bitterness dominates is narrower. Ground 25 µm coarser and brewed 2 °C cooler to sit inside that margin. Some guides say to grind finer because decaf tastes flat — flat is usually a roast applied without adjusting for the bean, and grinding finer into a fast-extracting bean makes it flat and astringent instead.'

/**
 * Legacy ids, from before the taxonomy had families. Saved bean records may
 * still carry them, and a stored value that silently stops resolving is worse
 * than a rename.
 */
const LEGACY: Record<string, ProcessId> = {
  anaerobic: 'anaerobicNatural',
  honey: 'honeyYellow',
}

export function resolveProcessId(id: string | undefined): ProcessId | undefined {
  if (!id) return undefined
  if (id in PROCESS_BY_ID) return id as ProcessId
  return LEGACY[id]
}

/**
 * Bags say "natural anaerobic", "washed process", "red honey", "carbonic
 * maceration", "Giling Basah", "72h lactic". The shelf stores whatever the user
 * typed, so the generator has to read it rather than demand a dropdown.
 *
 * Order matters, and it is most-specific-first. An anaerobic natural is brewed
 * as an anaerobic natural, not as a natural, because the sealed ferment is the
 * dominant fact about it; a thermal-shock coffee is brewed as thermal shock
 * even though it is also anaerobic and also usually a natural.
 */
export function processFromText(text: string | undefined): ProcessId | undefined {
  if (!text) return undefined
  const t = text.toLowerCase()

  // Most specific interventions first — these override the drying style.
  if (/thermal.?shock|el paraiso|paraíso/.test(t)) return 'thermalShock'
  if (/koji|aspergillus/.test(t)) return 'koji'
  if (/co.?ferment|infus|added fruit|maceration with|cascara ferment/.test(t)) return 'coFerment'
  if (/yeast|inocul|starter culture|saccharomyces|pichia/.test(t)) return 'yeastInoculated'
  if (/carbonic/.test(t)) return 'carbonicMaceration'
  if (/lactic/.test(t)) return 'lactic'
  if (/anaerobic|anaerobi|co2 ferment|sealed ferment/.test(t)) {
    // An anaerobic can be pulped first or sealed whole, and they are not the
    // same brew. The label usually says which.
    return /washed|depulp|pulped|parchment/.test(t) ? 'anaerobicWashed' : 'anaerobicNatural'
  }

  // Regional and mechanical methods.
  if (/wet.?hull|giling|basah|mandheling|sumatra/.test(t)) return 'wetHulled'
  if (/monsoon|malabar/.test(t)) return 'monsooned'

  // Honey, by colour where stated.
  if (/white honey/.test(t)) return 'honeyWhite'
  if (/yellow honey|gold honey/.test(t)) return 'honeyYellow'
  if (/red honey/.test(t)) return 'honeyRed'
  if (/black honey/.test(t)) return 'honeyBlack'
  // "Pulped natural" is honey despite the name, and unqualified honey is red:
  // it is the most common of the four and sits in the middle.
  if (/honey|miel|pulped natural|semi.?washed/.test(t)) return 'honeyRed'

  // Drying style.
  if (/extended natural|raisin|late harvest|tree.?dried/.test(t)) return 'naturalExtended'
  if (/natural|dry.?process|unwashed|sun.?dried/.test(t)) return 'natural'
  if (/double.?washed|double.?ferment|kenya|twin.?ferment/.test(t)) return 'washedDouble'
  if (/washed|wet.?process|lavado|fully washed/.test(t)) return 'washed'

  return undefined
}

/** True when the label says this is decaffeinated. */
export function decafFromText(text: string | undefined): boolean {
  if (!text) return false
  return /decaf|decaff|swiss water|ethyl acetate|\bea\b process|sugarcane process|co2 process|descafein/i.test(
    text,
  )
}
