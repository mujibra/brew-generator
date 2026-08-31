/**
 * Knowledge cards — PRD 8.7, 8.8, 8.6, 8.10, F11.
 *
 * The first set deliberately covers exactly the mechanisms the dial-in engine
 * cites, because PRD F4 R6 promises every recommendation links to an
 * explanation and until now those links went nowhere.
 *
 * Editorial rules, enforced by cards.test.ts:
 *   - every card carries a practicalImplication
 *   - every card carries at least one source
 *   - every `related` id resolves
 *   - every mechanismCardId in the dial-in rules resolves
 */

import type { Card } from './types'

const SCA_WATER: Card['sources'][number] = {
  title: 'Water Quality Handbook / SCA Water Standard',
  author: 'Specialty Coffee Association',
  kind: 'industry-standard',
}

const RAO: Card['sources'][number] = {
  title: 'Everything but Espresso',
  author: 'Scott Rao',
  year: 2010,
  kind: 'book',
}

const WATER_FOR_COFFEE: Card['sources'][number] = {
  title: 'Water for Coffee',
  author: 'Christopher H. Hendon and Maxwell Colonna-Dashwood',
  year: 2015,
  kind: 'book',
}

const CRAFT_AND_SCIENCE: Card['sources'][number] = {
  title: 'The Craft and Science of Coffee',
  author: 'Britta Folmer (ed.)',
  year: 2017,
  kind: 'book',
}

const GAGNE: Card['sources'][number] = {
  title: 'The Physics of Filter Coffee',
  author: 'Jonathan Gagné',
  year: 2021,
  kind: 'book',
}

const LOCKHART: Card['sources'][number] = {
  title: 'The Coffee Brewing Control Chart',
  author: 'E. E. Lockhart, Coffee Brewing Institute',
  year: 1957,
  kind: 'industry-standard',
}

const KASUYA: Card['sources'][number] = {
  title: 'Ice brew and the iced 4:6 method',
  author: 'Tetsu Kasuya (2016 World Brewers Cup champion)',
  kind: 'practitioner',
  url: 'https://kurasu.kyoto/blogs/kurasu-journal/tetsu-kasuya-ice-brew-coffee-english',
}

const COLD_VS_HOT: Card['sources'][number] = {
  title:
    'Comparison of Characterization of Cold Brew and Hot Brew Coffee Prepared at Various Roasting Degrees',
  author: 'Pan et al., Journal of Food Processing and Preservation',
  year: 2023,
  kind: 'peer-reviewed',
  url: 'https://onlinelibrary.wiley.com/doi/10.1155/2023/3175570',
}

const REVIEWED = '2026-08-27'

export const CARDS: Card[] = [
  // ---------------------------------------------------------------- extraction
  {
    id: 'extraction/strength-vs-yield',
    category: 'extraction',
    name: 'Strength vs extraction yield',
    aliases: ['TDS', 'concentration', 'EY', 'strong vs over-extracted'],
    summary:
      'Strength is how much dissolved coffee is in the water; extraction yield is what fraction of the grounds dissolved. They are independent numbers, and confusing them is the costliest mistake in brewing.',
    practicalImplication:
      'If a cup is weak but not sour, use more coffee per litre — do not grind finer. Grinding finer fixes extraction, not strength, and will push a thin cup straight into bitterness.',
    body: {
      quick:
        'Two different numbers. Strength (TDS %) is concentration; extraction yield (EY %) is how much of the coffee you actually dissolved. Confusing them is the most common and most expensive mistake in brewing.',
      standard: `A cup can be weak and over-extracted at the same time — that is the combination people find impossible until they separate the two axes.

Strength is set almost entirely by your brew ratio: more coffee per litre of water means a stronger cup. Extraction yield is set by grind, temperature, time, agitation and water chemistry.

The practical consequence: when something is wrong, work out which axis it is on before you touch anything. "Thin" is usually strength. "Sour" or "bitter" is usually extraction.`,
      deep: `Extraction yield is computed, not measured directly:

    EY% = (TDS% × beverage mass) / dose mass

You need a refractometer for TDS and a scale for the masses. The beverage mass is not the water you poured — the spent grounds retain roughly twice their own weight in water, so 500 g of water over 30 g of coffee yields about 440 g in the cup.

Plotting strength against yield gives you the brew control chart, which is the whole reason the two-axis model is worth internalising. A brew at 1.10 % TDS and 22 % EY is weak AND over-extracted: you extracted plenty, you just spread it across too much water.`,
    },
    related: ['extraction/golden-cup', 'extraction/solubility-order', 'extraction/grind-size'],
    sources: [LOCKHART, RAO],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'extraction/solubility-order',
    category: 'extraction',
    name: 'Why sour comes before bitter',
    aliases: ['solubility order', 'extraction order', 'under-extraction', 'over-extraction'],
    summary:
      'Coffee compounds do not dissolve all at once. Acids leave first, sugars next, bitter and drying compounds last.',
    practicalImplication:
      'Sour means you stopped too early — extract more. Bitter and drying means you went too far — extract less. This single ordering is what makes taste a usable instrument.',
    body: {
      quick:
        'Acids and fruity aromatics dissolve fastest, then sugars and browning compounds, then the bitter and astringent ones. So under-extraction tastes sour and thin, and over-extraction tastes bitter and hollow.',
      standard: `Think of the brew as passing through phases rather than arriving at once.

Early: organic acids (citric, malic, acetic) and the light volatile aromatics. A brew stopped here is sharp, thin, and tastes like it is missing its middle.

Middle: sugars, melanoidins from the Maillard reaction, the compounds that read as sweetness and body. This is where you want to finish.

Late: heavier phenolics and chlorogenic acid lactones, plus the compounds that dry your mouth. Push past the middle and these arrive without adding anything you wanted.

This is why sweetness peaks in the middle of the extraction range rather than at either end.`,
      deep: `The ordering is a consequence of molecular size, polarity and where compounds sit in the cell structure — smaller, more polar molecules migrate out of the grounds faster.

It is also why the two error states taste like opposites but share a cause. Both are "wrong amount extracted", one in each direction, and both can be corrected with the same lever pushed the other way.

Worth noting what this does NOT explain: a cup that is sour AND drying at once. That is not a point on this line — it is two different parts of the same coffee bed extracting to different degrees, which is channelling.`,
    },
    related: [
      'extraction/strength-vs-yield',
      'extraction/channelling',
      'sensory/sour-vs-bitter',
      'sensory/astringency',
    ],
    sources: [CRAFT_AND_SCIENCE, RAO],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'extraction/grind-size',
    category: 'extraction',
    name: 'Grind size',
    aliases: ['grind', 'finer', 'coarser', 'particle size'],
    summary:
      'Grinding finer exposes more surface area and slows the flow, so more dissolves. It is the strongest and most reversible lever you have.',
    practicalImplication:
      'Change grind first when a cup is sour or bitter, and change nothing else at the same time. One or two clicks is a real move; half a bag of guesswork is not.',
    body: {
      quick:
        'Finer grind means more surface area and slower drainage, so extraction goes up. Coarser means the opposite. It is the first thing to adjust because it is cheap to undo.',
      standard: `Grind changes extraction two ways at once, and they compound.

Surface area: halving particle diameter roughly quadruples the surface exposed to water, so there is far more coffee in contact.

Flow resistance: smaller particles pack a denser bed, water moves through more slowly, and contact time rises.

That double effect is why grind moves the cup more than any other single control, and why it is the right first adjustment. It is also why big jumps overshoot — the two effects together mean a small movement on the dial is a large movement in the cup.

The limit is the tail: past a point, finer grind stops raising useful extraction and starts producing fines that clog the bed and add astringency.`,
      deep: `A useful rule of thumb: on a filter brew, about 30–40 µm of median particle size is roughly one perceptible step in the cup. On a hand grinder at 15 µm per click that is two or three clicks; on one at 30 µm per click it is one.

Absolute micron figures do not transfer reliably between grinders, though. Burr geometry changes the distribution, not just the median, and two grinders set to "the same" median can produce noticeably different cups. This is why an offset from a setting you already know works beats an absolute number.

Grinding finer to fix a slow, sour brew is the classic trap. If the drawdown is already long and the cup is still sour, the water is bypassing the bed rather than passing through it, and a finer grind makes that worse.`,
    },
    related: [
      'grind/particle-distribution',
      'extraction/channelling',
      'extraction/solubility-order',
      'grind/burr-geometry',
    ],
    sources: [RAO, GAGNE],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'extraction/channelling',
    category: 'extraction',
    name: 'Channelling',
    aliases: ['uneven extraction', 'bypass', 'crater', 'high and dry'],
    summary:
      'Water finds the path of least resistance and races through part of the bed while barely touching the rest.',
    practicalImplication:
      'A cup that is sour and bitter at once, or sour despite a long brew time, is channelling. Fix the pour and the bed — grinding finer will make it worse.',
    body: {
      quick:
        'Water takes the easy route. Part of the bed over-extracts, part barely extracts at all, and you taste both in the same cup. Long brew time plus a sour cup is the signature.',
      standard: `An even bed extracts evenly. An uneven one extracts twice — too much where water flows, too little where it does not — and the cup carries both faults.

You can read it off the spent bed:

- **Crater in the middle** — pour was too central and too aggressive.
- **High and dry ring** at the edges — grounds up the walls never got wet.
- **Muddy pool** on top — fines migrated down and sealed the filter.
- **Visible channels or holes** — water cut straight through.

The fixes are technique, not settings: level the bed before you pour, keep pours centred and gentler, swirl after the bloom rather than stirring, and make sure the bloom wets every ground.`,
      deep: `Channelling is why brew time on its own is a bad diagnostic. A long brew can mean a fine grind (extraction went up) or a clogged, channelling bed (extraction went down). Same clock reading, opposite corrections.

That is what makes the drawdown question worth asking before touching the grinder. Sour with a fast drawdown is under-extraction from a coarse grind. Sour with a slow drawdown is almost always channelling, and the coarse-grind fix would be exactly wrong.

Agitation cuts both ways here. Some agitation after the bloom levels the bed and helps. Too much drives fines downward, seals the filter, and creates the very unevenness you were trying to remove.`,
    },
    related: ['extraction/agitation', 'extraction/grind-size', 'grind/particle-distribution'],
    sources: [RAO, GAGNE],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'extraction/temperature',
    category: 'extraction',
    name: 'Water temperature',
    aliases: ['brew temperature', 'temp', 'hotter', 'cooler'],
    summary:
      'Hotter water dissolves more of everything, desirable and not. It is a real lever but a blunt one.',
    practicalImplication:
      'Match temperature to roast level first: hotter for light roasts, cooler for dark. Then leave it alone and use grind for fine adjustment.',
    body: {
      quick:
        'Higher temperature raises solubility across the board. Light roasts are dense and need the heat; dark roasts are brittle and soluble and will over-extract with it.',
      standard: `Rough starting points by roast level:

- Very light / Nordic — 94–96 °C
- Light — 93–96 °C
- Medium — 91–94 °C
- Medium-dark — 88–92 °C
- Dark — 85–90 °C

The logic is solubility. Roasting breaks down cell structure, so a darker roast gives up its solubles far more easily. The same water that a light Kenyan needs will strip a dark roast into bitterness.

Temperature is blunt because it moves everything at once — you cannot use it to extract more sweetness without also extracting more of the bitter compounds. Grind gives you finer control, which is why temperature is usually set once per bean rather than adjusted per brew.`,
      deep: `Kettle temperature is not slurry temperature. Pouring 96 °C water into a cold brewer over room-temperature grounds can land the slurry several degrees lower, and the gap widens with a small dose, a cold room, or an unrinsed ceramic cone. Preheating is not fussiness; it is the difference between the number you set and the number the coffee sees.

Altitude matters too: water boils lower as you go up, so at 1,500 m your "boiling" water is around 95 °C, and a recipe calling for 96 °C is simply unavailable.

The common myth worth naming: that boiling water "burns" coffee. It does not — there is no combustion. It over-extracts, which is a different problem with a different fix.`,
    },
    related: [
      'roast/levels',
      'extraction/solubility-order',
      'extraction/grind-size',
      'extraction/flash-brew',
    ],
    sources: [RAO, CRAFT_AND_SCIENCE],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'extraction/agitation',
    category: 'extraction',
    name: 'Agitation',
    aliases: ['stirring', 'swirl', 'turbulence', 'Rao spin'],
    summary:
      'Stirring, swirling and pour force all speed extraction by refreshing the water in contact with each particle.',
    practicalImplication:
      'If the cup is astringent and the drawdown is slow, agitate less: gentler pours, no stir, and let the bed settle on its own.',
    body: {
      quick:
        'Agitation refreshes the water touching each particle, so extraction rises. Too much drives fines into the filter, slows drainage, and adds a drying finish.',
      standard: `As coffee dissolves, the water immediately around each particle becomes saturated and extraction there slows. Moving the slurry replaces it with fresher water, which is why stirring raises yield without any change to grind or time.

The cost is mechanical. Agitation carries fine particles downward, where they pack against the filter and restrict flow. You get higher extraction and a slower, less even drawdown at the same time — and past a point the second effect dominates.

Practical middle ground: swirl or stir once after the bloom to wet everything and level the bed, then pour gently and leave it alone. A final swirl to flatten the bed helps the drawdown stay even. Chasing clarity? Skip that last swirl.`,
      deep: `Agitation is the lever most people adjust without realising it. Pour height, flow rate, whether you pour into the centre or in circles — all of it is agitation, and none of it appears in a recipe written as grams and times.

That is a large part of why the same written recipe produces different cups in different hands, and why "follow the recipe exactly" is not achievable in the way people assume.

The Rao spin — swirling the brewer immediately after the final pour — is a deliberate use of the trade-off: accept some fines migration in exchange for a flat, evenly draining bed. It works well on a cone and is largely redundant on a flat-bottom brewer, which levels itself.`,
    },
    related: ['extraction/channelling', 'grind/particle-distribution', 'extraction/grind-size'],
    sources: [RAO, GAGNE],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'extraction/golden-cup',
    category: 'extraction',
    name: 'The Golden Cup range',
    aliases: ['SCA standard', 'brew control chart', 'ideal extraction'],
    summary:
      'The SCA targets 18–22 % extraction yield at 1.15–1.35 % strength. It is a well-evidenced default, not a law.',
    practicalImplication:
      'Use it as a starting box, then find your own. Plenty of excellent light-roast filter coffee is brewed outside it, and your preference is the number that matters.',
    body: {
      quick:
        'Extraction yield 18–22 %, strength 1.15–1.35 %, roughly 55 g of coffee per litre of water. A sensible place to start, and not a verdict on your taste.',
      standard: `The range comes from mid-century consumer preference research — Lockhart's work at the Coffee Brewing Institute — where large panels of American drinkers rated brews across a grid of strengths and yields. The box is where most people landed.

That history is worth knowing, because it explains the limits. The panels were drinking the coffees of their time at the roast levels of their time. Modern light-roast specialty coffee, brewed for clarity and acidity, quite often scores well above 22 % yield without tasting over-extracted.

So treat the box as a well-evidenced prior. If your best cups sit at 23 %, your best cups sit at 23 %.`,
      deep: `The chart plots strength on one axis and yield on the other, which lets you name any fault precisely. Under-extracted and weak sits bottom-left; over-extracted and strong sits top-right. Diagonals through the box are lines of constant brew ratio.

Once you have logged enough brews with both numbers, the more useful figure is where YOUR high-scoring cups cluster, which may well sit off-centre from the published box. That is the point at which the standard has done its job and can be retired in favour of your own data.

One honest caveat about the numbers themselves: refractometer TDS readings depend on sample preparation, temperature and the instrument's conversion factor. Treat 0.05 % as noise rather than signal.`,
    },
    related: ['extraction/strength-vs-yield', 'extraction/solubility-order'],
    sources: [LOCKHART, { ...RAO }],
    confidence: 'contested',
    lastReviewed: REVIEWED,
  },

  {
    id: 'extraction/percolation-vs-immersion',
    category: 'extraction',
    name: 'Percolation vs immersion',
    aliases: ['pourover vs french press', 'drip vs steep', 'immersion'],
    summary:
      'Percolation passes fresh water through the bed continuously. Immersion lets the coffee sit in a fixed volume until it approaches equilibrium.',
    practicalImplication:
      'Immersion is far more forgiving — grind and time matter less. Choose it when you want a reliable cup, and percolation when you want clarity and control.',
    body: {
      quick:
        'Pourover keeps replacing the water touching the coffee, so extraction can keep climbing. Immersion approaches equilibrium and then largely stops, which makes it hard to get badly wrong.',
      standard: `In a percolation brew the concentration gradient is constantly refreshed, so extraction is driven hard and remains sensitive to grind, pour and flow. That sensitivity is what gives you control — and what gives you channelling.

In an immersion brew the water saturates and extraction self-limits. Doubling the steep time on a French press changes the cup far less than doubling the drawdown on a V60 would. There is also no bed for water to bypass, so channelling is not a failure mode.

The trade is clarity. Immersion leaves more fines and, with a metal filter, more oils in suspension, giving a heavier and less separated cup.

Hybrids like the Clever and Hario Switch exist to take the even extraction of immersion and then drain through the bed for a cleaner finish.`,
      deep: `The forgiveness of immersion is worth using deliberately. Give a beginner a French press and their brews will vary far less than on a cone, because the two variables they cannot yet control — pour technique and flow rate — have been removed from the equation.

It also changes what a "grind too fine" error costs. On a cone, too fine means a stalled, astringent brew. In immersion it mostly means more fines in the cup, which the no-plunge method largely solves by letting them settle instead of pressing them through.`,
    },
    related: ['extraction/filter-media', 'extraction/channelling', 'extraction/agitation'],
    sources: [CRAFT_AND_SCIENCE, RAO],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'extraction/flash-brew',
    category: 'extraction',
    name: 'Flash brew and iced coffee',
    aliases: [
      'japanese iced',
      'japanese iced coffee',
      'flash brew',
      'iced pour over',
      'cold brew',
      'iced',
      'over ice',
      'watery iced coffee',
    ],
    summary:
      'Flash brew replaces part of the brew water with ice in the carafe and brews hot straight onto it. The drink lands at full strength and keeps the aromatics that a slow cool-down or a cold steep never delivers.',
    practicalImplication:
      'Never pour finished coffee over ice — that is dilution, not a recipe. Put 33-50 % of the water in the carafe as ice, brew the rest hot, and check the ratio the bed actually sees before you blame the grind.',
    body: {
      quick:
        'Ice in the carafe, hot brew on top. The ice is part of the recipe water rather than an addition to it, so melting it finishes the drink instead of watering it down. Grind finer and brew hotter than the same recipe hot.',
      standard: `There are two numbers in an iced brew and confusing them is the whole problem. The drink ratio is dose against ALL the water, ice included — that is the strength you taste. The brew ratio is dose against the hot water only — that is what the coffee bed actually extracts at.

At 20 g, 320 g total and 40 % ice, the drink is 1:16 and the bed is 1:9.5. Kasuya quotes his iced 4:6 as 1:10, which is the same brew described from the bed's side.

Published splits run from a third ice to a half. More ice chills harder and brews a tighter concentrate; less ice is gentler on the bed but risks not melting away, which leaves the drink stronger than the recipe claims. Below roughly 1:8 on the bed the method breaks down — the bloom and the water the grounds retain eat too much of what little there is, and the cup comes out thin and sour no matter how fine you grind.

Two compensations follow from the short contact time: grind finer than you would hot, and brew hotter (93-96 C is the published band). Use solid cubes, not crushed. Crushed ice melts before the brew lands and dilutes the early, strongest fractions.`,
      deep: `Why not just cold brew? Because cold water is selective. Hot-brewed coffee carries measurably more volatile aroma compounds than cold brew of the same coffee, and extracts more of the acids that read as fruit and sweetness rather than as sourness. Cold brew's smoothness is partly the absence of those compounds. Flash brew extracts hot, then chills in seconds, so the volatiles are trapped in a cold liquid instead of leaving with the steam of a slow cool-down.

Cold also mutes perception. The same liquid tastes less sweet and lighter-bodied cold than warm, which is why practitioners often brew iced a point or two tighter than they would hot. Fix that with ratio, not grind — grind moves extraction and will take you sour or bitter, ratio moves strength.

Related methods worth not confusing with this one:

- **Ice-on-bed (Kasuya's "ice brew")** — ice sits on the grounds and cold water is poured over it, extracting as it melts. Sweet and delicate, and openly low in reproducibility.
- **Kyoto / slow drip** — cold water dripped through the bed over hours. Its own drink, not a fast substitute.
- **Immersion iced** — brew hot in a press or AeroPress, then decant onto the weighed ice. Same arithmetic, no dripping required.

If ice is still floating when the drawdown ends, swirl until it goes. Serving over fresh ice in the glass is a second dilution and the recipe does not account for it.`,
    },
    related: [
      'extraction/temperature',
      'extraction/strength-vs-yield',
      'extraction/percolation-vs-immersion',
      'sensory/sour-vs-bitter',
    ],
    sources: [COLD_VS_HOT, KASUYA, CRAFT_AND_SCIENCE],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'extraction/filter-media',
    category: 'extraction',
    name: 'Paper, cloth and metal filters',
    aliases: ['filter', 'paper', 'metal filter', 'rinse the filter'],
    summary:
      'The filter decides what reaches your cup — paper removes oils and fines, metal lets both through.',
    practicalImplication:
      'Rinse paper filters before brewing: it removes paper taste and preheats the brewer. If you want more body, change filter before you change recipe.',
    body: {
      quick:
        'Paper traps oils and fine particles for a clean cup. Metal passes both for a heavier one. Cloth sits in between. Always rinse paper first.',
      standard: `Paper is the most selective. It removes suspended fines and most lipids, which is why a paper-filtered cup tastes clean and separated. It also removes the diterpenes cafestol and kahweol, the compounds linked with raised LDL cholesterol in unfiltered coffee.

Metal passes fines and oils straight through. More body, more texture, less clarity, and silt at the bottom of the cup.

Cloth is between the two and gives a distinctive syrupy body, at the cost of real maintenance — it must be kept clean and wet or it turns rancid.

Thickness matters independently of grind: a Chemex filter is markedly thicker than a V60 one, so it drains more slowly at the same grind. Adjust coarser rather than fighting it.`,
      deep: `Rinsing paper does two jobs, and the second is the underrated one. It washes out papery flavour, and it preheats the brewer and carafe — which on a small dose can be worth several degrees of slurry temperature.

Bleached versus natural: natural (brown) papers carry noticeably more papery flavour and need a more thorough rinse. Bleached filters are not a health concern at these quantities; oxygen-bleached is the norm.

If your brews stall, suspect the paper before the grind. Filter permeability varies between batches and brands more than most people expect.`,
    },
    related: ['extraction/percolation-vs-immersion', 'grind/particle-distribution'],
    sources: [CRAFT_AND_SCIENCE, GAGNE],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  // --------------------------------------------------------------------- grind
  {
    id: 'grind/particle-distribution',
    category: 'grind',
    name: 'Particle size distribution',
    aliases: ['fines', 'boulders', 'bimodal', 'uniformity'],
    summary:
      'A grinder does not produce one size. It produces a spread, and the shape of that spread matters as much as its middle.',
    practicalImplication:
      'If a cup is sour and drying at once no matter how you adjust, your grinder is the limit — not your recipe. Fines over-extract while boulders under-extract, in the same brew.',
    body: {
      quick:
        'Every grind is a distribution with a peak of fines and a peak of larger particles. Fines extract fast and add body and astringency; boulders barely extract at all.',
      standard: `Grinding fractures coffee, and fracture does not produce uniform pieces. Real distributions are bimodal: a large peak around your target size plus a smaller peak of very fine particles.

Fines are not simply bad. They contribute body and much of the sweetness, and a grind with none tastes hollow. But they extract almost instantly, so a grind with too many gives you over-extracted flavour from part of the bed while the largest particles are still under-extracted.

That is the ceiling on what any recipe can achieve. If you have adjusted grind, temperature and technique and the cup remains simultaneously sour and drying, the distribution is the cause and no brewing change will fully fix it.`,
      deep: `Fines also migrate. Water carries them down through the bed, where they pack against the filter and restrict flow — which is why a fine grind can both raise extraction and stall the brew.

Sifting with a set of sieves removes them and demonstrably increases clarity. It also removes body and sweetness, takes real time, and wastes coffee. Most people who try it stop. It is worth doing once to hear what fines contribute.

Beware of "uniform grind" marketing. No burr set produces a single size, and comparative claims are difficult to verify without laser diffraction. Flat burrs generally produce a narrower spread than conical at filter settings, which is a real difference and a smaller one than the marketing implies.`,
    },
    related: ['grind/burr-geometry', 'extraction/grind-size', 'extraction/agitation'],
    sources: [GAGNE, RAO],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'grind/burr-geometry',
    category: 'grind',
    name: 'Flat and conical burrs',
    aliases: ['burrs', 'flat vs conical', 'alignment', 'burr wear'],
    summary:
      'Burr shape changes the particle distribution, not just the average size. Neither type is simply better.',
    practicalImplication:
      'When translating a setting between grinders, expect to re-dial rather than match numbers. Different distributions taste different at the same median size.',
    body: {
      quick:
        'Flat burrs tend to produce a narrower distribution, conical a wider one with more fines. Both make excellent coffee; they do not make the same coffee at the same setting.',
      standard: `Conical burrs grind by pulling beans down a tapering gap. They are efficient, tolerant of misalignment, and generally produce a wider spread with more fines. Almost every good hand grinder is conical, for mechanical reasons.

Flat burrs grind between two parallel rings, throwing the grounds outward. They typically give a narrower distribution, at the cost of more retention, more heat, and much greater sensitivity to alignment.

Practical consequences: a flat-burr grinder can often be run slightly coarser for the same extraction, because fewer fines are doing the work. And a misaligned flat set can perform worse than a decent conical, since a gap that varies around the circumference produces two grinds at once.`,
      deep: `Retention is the quiet problem. Grounds left in the chamber from the last dose come out with this one, so a grinder with high retention is always brewing a small fraction of stale coffee at the previous setting. It also makes single-dosing and dialling in slower, because a setting change does not fully take effect until the old grounds clear.

Burrs wear. A well-used set produces more fines and a wider spread than a new one, drifting the grinder gradually finer in effect while the numbers on the dial stay put. This is one more reason your own baseline setting beats any absolute figure.

Static is worth mentioning: a few drops of water on the beans before grinding (the Ross Droplet Technique) markedly reduces static clumping and mess, and has no detectable downside for filter brewing.`,
    },
    related: ['grind/particle-distribution', 'extraction/grind-size'],
    sources: [GAGNE, { title: 'Barista Hustle', kind: 'practitioner' }],
    confidence: 'emerging',
    lastReviewed: REVIEWED,
  },

  // ---------------------------------------------------------------------- roast
  {
    id: 'roast/degassing',
    category: 'roast',
    name: 'Degassing and rest',
    aliases: ['CO2', 'bloom', 'too fresh', 'resting coffee'],
    summary:
      'Roasting traps carbon dioxide in the bean. It escapes over days, and while it is escaping it interferes with brewing.',
    practicalImplication:
      'Coffee under about 4 days off roast will bloom violently and taste muted and uneven. Give a light roast 7–14 days before you judge it.',
    body: {
      quick:
        'Fresh coffee is full of CO2, which pushes water away from the grounds and makes extraction uneven. Rest it: light roasts around 7–21 days, dark roasts 2–7.',
      standard: `The gas is a genuine physical obstacle. It forms bubbles that block water from reaching coffee surfaces, so extraction is both lower and less even than the same coffee will give a week later.

That is what the bloom is for — a small pour, thirty to forty-five seconds, to drive off the bulk of it before the real brewing starts. A vigorous, high-rising bloom is a reliable sign the coffee is still very fresh.

Rough guidance by roast level, for filter:

- Very light — 10–21 days
- Light — 7–18 days
- Medium — 4–12 days
- Dark — 2–7 days

Darker roasts have lost more structure, so they release gas faster and stale faster too.`,
      deep: `"Fresher is better" is the widespread and wrong version of this. Fresher is better than stale; it is not better than rested. Day-two coffee is genuinely harder to brew well than day-ten coffee, and a beginner handed a bag roasted yesterday is being set up to fail.

Freezing changes the arithmetic usefully. Coffee frozen in airtight single-dose portions after resting holds close to that state for months, and can be ground straight from frozen — the brittleness even narrows the particle distribution slightly. What ruins it is repeated freeze-thaw cycles, which condense moisture onto the beans.

The peak window is personal. Once you have scored six or so brews from a bag you will often find your own best days sit somewhere other than the generic curve suggests.`,
    },
    related: ['roast/staling', 'roast/levels', 'extraction/agitation'],
    sources: [CRAFT_AND_SCIENCE, RAO],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'roast/staling',
    category: 'roast',
    name: 'Staling',
    aliases: ['stale coffee', 'old coffee', 'flat', 'oxidation'],
    summary:
      'Aromatics oxidise and escape long before sweetness disappears, so stale coffee tastes dull rather than obviously bad.',
    practicalImplication:
      'A flat, dull cup from coffee more than about five weeks off roast is stale. No brewing change will bring the aromatics back — open a new bag.',
    body: {
      quick:
        'Oxygen and time destroy the volatile aromatics that make coffee smell like anything. What remains is body and some sweetness, which is why stale coffee reads as boring rather than spoiled.',
      standard: `Three things happen in parallel: volatile aromatics escape or oxidise, lipids oxidise toward rancidity, and the beans absorb moisture and ambient odours.

The aromatics go first and they are the largest part of what you perceive as flavour, so the cup loses its identity while still tasting recognisably of coffee. Drinkers describe it as flat, papery, or cardboard-like.

Ground coffee stales far faster than whole beans — surface area again. Grinding a week's worth in advance costs you more than any recipe adjustment could recover.

Storage that helps: airtight, opaque, room temperature, and away from anything aromatic. Storage that does not: the fridge, which is humid and full of smells.`,
      deep: `This is why "roasted on" beats "best before". A best-before date tells you what the roaster is willing to guarantee; a roast date tells you what you are actually holding.

Diagnostically, staleness is easy to confuse with high water alkalinity — both flatten a cup. The tell is the bloom. Stale coffee barely blooms at all, because the CO2 has long since gone. If your bloom is lifeless and the cup is dull, it is the coffee. If the bloom is healthy and the cup is dull, look at your water.`,
    },
    related: ['roast/degassing', 'water/alkalinity'],
    sources: [CRAFT_AND_SCIENCE],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'roast/levels',
    category: 'roast',
    name: 'Roast level and how to brew it',
    aliases: ['light roast', 'dark roast', 'Agtron', 'development'],
    summary:
      'Roast level is the single biggest determinant of how a coffee should be brewed, because it sets density and solubility.',
    practicalImplication:
      'Light roasts: finer, hotter, longer. Dark roasts: coarser, cooler, shorter. Getting this wrong swamps every other adjustment you make.',
    body: {
      quick:
        'Roasting breaks down cell structure, so darker coffee dissolves more easily. Light roasts need more energy — finer grind, hotter water. Dark roasts need less of everything.',
      standard: `What changes as roast progresses: moisture leaves, the bean expands and becomes brittle, sugars caramelise and then break down, acids degrade, and cell walls fracture.

A light roast is therefore dense, hard, and relatively insoluble, holding more of its original acidity. A dark roast is porous, brittle, and highly soluble, with roast-derived bitterness in place of origin acidity.

Practical translation:

| Roast | Grind | Temp | Ratio | Time |
| --- | --- | --- | --- | --- |
| Very light | Finer | 94–96 °C | 1:15–1:16 | Longer |
| Medium | Baseline | 91–94 °C | 1:16–1:17 | Baseline |
| Dark | Coarser | 85–90 °C | 1:15–1:17 | Shorter |

Growing altitude compounds this. A high-grown bean is denser still, so a light roast of a 1,900 m Kenyan is the hardest case: it wants your finest grind and hottest water.`,
      deep: `Roast colour is measured on the Agtron scale, where higher numbers are lighter. Ground readings run lower than whole-bean ones for the same coffee, and the gap between them is itself informative — a large gap suggests the outside roasted faster than the inside.

The roast defect most people never learn to name is **baked**: a roast that spent too long between first crack and the drop, without enough heat. It is not scorched or obviously burnt. It simply tastes flat, cereal-like and hollow, with no acidity and no sweetness, and no brewing adjustment recovers it. If a coffee tastes like nothing in particular across three well-executed brews at different grinds, consider that the roast rather than you.`,
    },
    related: ['extraction/temperature', 'roast/degassing', 'extraction/grind-size'],
    sources: [CRAFT_AND_SCIENCE, RAO],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  // ---------------------------------------------------------------------- water
  {
    id: 'water/alkalinity',
    category: 'water',
    name: 'Alkalinity',
    aliases: ['KH', 'carbonate hardness', 'buffering', 'bicarbonate', 'flat coffee'],
    summary:
      'Alkalinity is your water’s capacity to neutralise acid. It works as a volume knob on everything acidic in the cup.',
    practicalImplication:
      'If your coffee tastes flat and dull despite good technique and fresh beans, high alkalinity is the most likely cause. Cut your water with distilled.',
    body: {
      quick:
        'Bicarbonate in water buffers coffee acids, muting perceived acidity. Too much and the cup goes flat and chalky; none at all and it can taste harsh and sharp.',
      standard: `Coffee is acidic, and much of what makes a good cup interesting is acidity. Alkalinity chemically neutralises those acids as they are extracted — so the same coffee, brewed identically, tastes bright in low-alkalinity water and dull in high-alkalinity water.

The SCA target is around 40 ppm as CaCO₃. Above roughly 70 ppm the flattening becomes obvious. Many municipal supplies run well past 100 ppm, which is why a café's water treatment is often the largest single difference between their cup and yours.

Note it is separate from hardness. Water can be hard and low-alkalinity, or soft and high-alkalinity, and the two do quite different things.`,
      deep: `Zero alkalinity is not the goal either. Some buffering keeps the sharpest acids in check; brewing in water with no alkalinity at all can produce a cup that reads as aggressive or sour rather than bright.

Alkalinity also protects your equipment against the corrosive tendency of very soft water, which is why building brewing water on distilled with no bicarbonate at all is a poor idea for anything with a boiler.

Diagnostically, high alkalinity and stale coffee both produce a flat cup. Check the bloom to tell them apart: healthy bloom plus flat cup points at water.`,
    },
    related: ['water/minerals', 'roast/staling', 'sensory/sour-vs-bitter'],
    sources: [WATER_FOR_COFFEE, SCA_WATER],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'water/minerals',
    category: 'water',
    name: 'Magnesium, calcium and hardness',
    aliases: ['GH', 'general hardness', 'Mg', 'Ca', 'minerals'],
    summary:
      'Dissolved magnesium and calcium actively bind coffee compounds and pull them into solution. Pure water extracts poorly.',
    practicalImplication:
      'Magnesium favours brightness and fruit; calcium favours body. If your coffee tastes thin and hollow with no obvious fault, your water may simply be too soft.',
    body: {
      quick:
        'Hardness is not a contaminant — it is part of the extraction mechanism. Magnesium binds flavour compounds more strongly and reads as brightness; calcium reads as body.',
      standard: `Water is the solvent, and which ions it carries changes what it dissolves.

**Magnesium (Mg²⁺)** binds coffee's flavour compounds strongly, favouring the fruity and acidic ones. Water weighted toward magnesium tastes brighter and more aromatic. Too much and it tips into harsh.

**Calcium (Ca²⁺)** extracts heavier, creamier compounds, giving more body. Too much and the cup turns chalky — and calcium is what forms limescale in your kettle.

The SCA target is around 68 ppm total hardness as CaCO₃. Distilled or RO water alone sits at zero, extracts noticeably poorly, and tastes flat and hollow — it is a base for building water, not a brewing water.`,
      deep: `You can build water deliberately from distilled plus salts, and the arithmetic is simpler than it looks because each salt feeds one number. Epsom salt (MgSO₄·7H₂O) adds magnesium hardness; calcium chloride or gypsum adds calcium hardness; sodium or potassium bicarbonate adds alkalinity.

One trap when weighing: hydrated salts carry water of crystallisation. Epsom salt is over half water by mass, so the dissolved solids you actually add are roughly half what the scale reads. Ignore that and you will substantially overestimate your TDS.

A TDS meter, incidentally, cannot tell you any of this. It reports total dissolved solids via conductivity — not which ions, and not the hardness-to-alkalinity balance that determines how your coffee tastes.`,
    },
    related: ['water/alkalinity', 'extraction/strength-vs-yield'],
    sources: [WATER_FOR_COFFEE, SCA_WATER],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  // -------------------------------------------------------------------- sensory
  {
    id: 'sensory/sour-vs-bitter',
    category: 'sensory',
    name: 'Sour vs bitter, acidic vs sour',
    aliases: ['sour', 'bitter', 'acidity', 'sharp'],
    summary:
      'Sour and bitter are opposite faults with opposite fixes, and they are the two most commonly confused sensations in brewing.',
    practicalImplication:
      'Learn to tell them apart before you adjust anything, because the corrections point in opposite directions. Sour: extract more. Bitter: extract less.',
    body: {
      quick:
        'Sour is sharp and makes you wince, felt at the sides of the tongue, and fades fast. Bitter is heavy and lingers at the back of the throat. Sour means under-extracted; bitter means over-extracted.',
      standard: `Two different distinctions are worth getting straight.

**Sour vs bitter.** Sour arrives immediately, is felt along the sides of the tongue, and disappears quickly. Bitter builds, sits at the back, and lingers. If you cannot tell, note when the sensation peaks — sour is early, bitter is late.

**Acidic vs sour.** These describe the same chemistry and opposite experiences. Acidity is structured and pleasant — the crispness of an apple, the lift in a good Kenyan. Sourness is unbalanced acidity with nothing supporting it: the same acids without the sweetness that should have come with them.

That is why "too acidic" is usually a mis-diagnosis. The problem is rarely too much acid; it is too little of everything else, which is an extraction problem.`,
      deep: `A deliberately useful exercise: brew the same coffee three ways in one sitting — one much too coarse, one dialled in, one much too fine. Taste them side by side, cold as well as hot.

Most people find they have been mislabelling one of the two for years, and a single side-by-side fixes it permanently. It is far more effective than tasting good coffee, because the reference points are at the extremes.

Temperature matters when you assess. A cup that tastes fine hot and harsh as it cools is slightly over-extracted — heat was masking it. Professional cupping evaluates across a temperature range for exactly this reason.`,
    },
    related: ['extraction/solubility-order', 'sensory/astringency', 'extraction/grind-size'],
    sources: [
      {
        title: 'Coffee Taster’s Flavor Wheel and Sensory Lexicon',
        author: 'SCA and World Coffee Research',
        year: 2016,
        kind: 'industry-standard',
      },
      CRAFT_AND_SCIENCE,
    ],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },

  {
    id: 'sensory/astringency',
    category: 'sensory',
    name: 'Astringency is not bitterness',
    aliases: ['astringent', 'drying', 'puckering', 'mouthfeel'],
    summary:
      'Astringency is a tactile drying sensation, not a taste. It is the clearest signal that you have extracted too far.',
    practicalImplication:
      'If your mouth feels dry and rough after swallowing, you over-extracted — regardless of whether the cup tasted bitter. Grind coarser or shorten the brew.',
    body: {
      quick:
        'Astringency is felt, not tasted: a rough, drying, puckering sensation like over-steeped tea. It signals over-extraction even when bitterness is mild.',
      standard: `Bitterness is a taste, detected by taste receptors. Astringency is a physical effect — polyphenols binding to the proteins in your saliva, reducing lubrication so your mouth feels rough.

They often arrive together, which is why people conflate them, but astringency is the more reliable diagnostic. It shows up at the tail of extraction and it is difficult to mistake for anything a well-brewed coffee does.

Sources: over-extraction generally, excessive fines, too much agitation, and grinders that produce a very wide particle distribution.

The same sensation in tea from over-steeping is the same mechanism, which is a useful reference point if you drink both.`,
      deep: `The combination worth learning to recognise is **sour plus astringent in the same cup**. That is not a point on the extraction line — it is two different parts of the bed extracting to different degrees.

The usual causes are channelling or a grinder producing too many fines alongside too many boulders. Adjusting overall extraction will not fix it, because there is no single extraction level to adjust; you have to make the bed extract evenly first.

Body and astringency are both mouthfeel rather than taste, and they are frequently confused in the other direction — a heavy, silty cup gets called astringent when it is merely full-bodied. Astringency dries; body coats.`,
    },
    related: ['sensory/sour-vs-bitter', 'grind/particle-distribution', 'extraction/channelling'],
    sources: [
      {
        title: 'Coffee Taster’s Flavor Wheel and Sensory Lexicon',
        author: 'SCA and World Coffee Research',
        year: 2016,
        kind: 'industry-standard',
      },
      GAGNE,
    ],
    confidence: 'established',
    lastReviewed: REVIEWED,
  },
]

export const CARD_INDEX = new Map(CARDS.map((c) => [c.id, c]))

export function cardById(id: string): Card | undefined {
  return CARD_INDEX.get(id)
}

export function cardsByCategory(): Map<Card['category'], Card[]> {
  const out = new Map<Card['category'], Card[]>()
  for (const card of CARDS) {
    const list = out.get(card.category) ?? []
    list.push(card)
    out.set(card.category, list)
  }
  return out
}

/** Substring search over name, aliases and summary. Enough for 18 cards. */
export function searchCards(query: string): Card[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return CARDS
  return CARDS.filter((c) =>
    [c.name, c.summary, c.practicalImplication, ...c.aliases]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  )
}
