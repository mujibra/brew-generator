# PRD — **Extraction**
### A manual-brew companion and specialty coffee knowledge engine

| Field | Value |
|---|---|
| Document | Product Requirements Document |
| Version | 1.0 |
| Status | Draft for review |
| Date | 2026-08-26 |
| Owner | mujibramadhan@datindo.co.id |
| Codename | `coffee-web-app` |

---

## 1. Summary

**Extraction** is a web application (installable PWA) for people who brew coffee by hand. It does two things, and it does them together:

1. **It runs the brew.** Guided, method-aware recipes with a step-driven timer, live pour targets, scale integration, and a log that remembers every cup you have ever made.
2. **It explains the coffee.** A structured, referenced knowledge base covering varieties, processing, terroir, roast, extraction science, water chemistry, grind, and sensory evaluation — linked directly into the brewing flow, so the theory arrives at the moment it becomes useful.

Most coffee apps are timers with a recipe list bolted on. Most coffee knowledge lives in books, forums, and video, disconnected from the moment of brewing. Extraction closes that loop: the app knows that your bean is a washed SL28 from Nyeri at 1,800 masl, roasted 6 days ago to Agtron 68, and that your last three brews were under-extracted — and it changes what it tells you to do next.

**One-line positioning:** the brew log that actually knows coffee.

---

## 2. Problem statement

### 2.1 What is broken

| Problem | Evidence / symptom |
|---|---|
| **Recipes are context-free.** | "30 g in, 500 g out, 2:30 bloom" says nothing about whether it fits a 3-day-old natural Ethiopian on a hand grinder. Users copy champion recipes and get bad coffee. |
| **Dial-in is folklore.** | Beginners adjust three variables at once, learn nothing, and conclude coffee is random. There is a real, teachable causal model (extraction yield, strength, particle distribution) but no consumer tool exposes it. |
| **Knowledge is unstructured.** | Variety, processing, and origin data live in blog prose. Nobody can answer "what does a Pink Bourbon typically taste like, and how should I adjust my V60 for it?" without 20 minutes of searching. |
| **Bag labels are opaque.** | "Fruity, Complex, Washed, Colombia" is on the bag. What the roaster did not print is the varietal lineage, the altitude band, the likely density, and what any of it implies for grind. |
| **Logs are write-only.** | Users record brews and never learn from them, because nothing analyses the log. |
| **Water is ignored.** | The single largest uncontrolled variable in home brewing (~98.5% of the cup) is treated as a footnote. |

### 2.2 Why now

- Home specialty brewing has stabilised around a small set of devices (V60, AeroPress, Switch, French press) — a finite, modellable problem space.
- Cheap Bluetooth scales (Bookoo Themis, Timemore Black Mirror, Acaia) and sub-$200 refractometers (DiFluid R2) put real measurement in home kitchens.
- The SCA's **Coffee Value Assessment (CVA)** replaced the 2004 cupping form, and the industry needs consumer-facing tools that speak the new vocabulary.
- Web Bluetooth and modern PWA storage make a kitchen-grade offline app viable without native builds.

---

## 3. Goals and non-goals

### 3.1 Goals

| # | Goal | Measured by |
|---|---|---|
| G1 | Make a first-time user brew a noticeably better cup within 3 sessions | Self-reported cup score delta; D3 retention |
| G2 | Turn dial-in from guesswork into a guided, single-variable loop | % of brews that follow a suggested adjustment; convergence in ≤4 brews |
| G3 | Be the most accurate and complete consumer-facing specialty coffee reference | Knowledge entity count; citation coverage; expert review pass |
| G4 | Bind knowledge to action — never present a fact without an implication | % knowledge cards reached from a brew context |
| G5 | Work fully offline, on a phone, with wet hands, in a dark kitchen | Zero-network brew completion rate; large-target UI audit |
| G6 | Respect the user's data — export everything, sell nothing | Export usage; zero third-party ad SDKs |

### 3.2 Non-goals (v1)

- **Espresso.** Pressure profiling, puck prep, and machine variance are a different product. The espresso data model is *forward-compatible* but the UI ships later (§16, Phase 4).
- **E-commerce.** No bean marketplace, no affiliate storefront, no checkout.
- **Social network.** No follows, feeds, likes, or DMs. Recipe sharing is link-based and read-only in v1.
- **Roasting control.** We *model* roast to interpret beans; we do not drive roasters or log roast curves.
- **Green coffee trading / farm management.** Out of scope entirely.
- **AI chat as the primary interface.** Structured tools first; assistive language features are additive (§9.6), never the only path.

---

## 4. Personas

| Persona | Who | Core need | Success looks like |
|---|---|---|---|
| **Maya — the new convert** | Bought a V60 and a hand grinder three weeks ago. Owns one bag of light roast. Overwhelmed. | "Just tell me what to do, and tell me why it worked." | Completes a guided brew, understands bloom, logs 5 brews in week 1 |
| **Dimas — the dialler-in** | Two years in. Owns a 1Zpresso, a Switch, a Bluetooth scale. Buys 3 bags a month. | "Help me converge faster and stop re-learning the same bag." | Uses the dial-in assistant, hits target EY, per-bean recipe memory |
| **Rina — the nerd** | Refractometer, water salts, sieves, spreadsheet of 400 brews. | "Give me data, exports, and correct science." | Imports her CSV, uses TDS/EY tooling, trusts the citations |
| **Arif — the pro** | Café barista / trainer. Preps for a brewers cup. Trains staff. | "Standardise recipes, cup properly, teach from the app." | CVA cupping sessions, shared house recipes, printable SOPs |
| **Sari — the gifted-a-bag drifter** | Received nice beans, has a French press, no intention of becoming a hobbyist. | "Don't make me learn anything. One good cup." | Two-tap recipe, no account required, still gets a great brew |

**Design tension to resolve deliberately:** Sari must never see Rina's UI, and Rina must never be blocked by Sari's. Resolved by **progressive disclosure** (§13.2) driven by an explicit *depth level*, not by hidden heuristics.

---

## 5. Product principles

1. **Every number has a reason.** No recipe value appears without an accessible "why this number".
2. **One variable at a time.** The dial-in engine never suggests two simultaneous changes unless the user opts into expert mode.
3. **The bag is the anchor.** Beans, not recipes, are the primary object. Recipes attach to beans; logs attach to both.
4. **Measurement optional, never required.** The app degrades gracefully from refractometer → scale → "a mug and a spoon".
5. **Cite or delete.** Any factual claim in the knowledge base carries a source. Contested claims are labelled contested, with both sides.
6. **Offline is the default assumption**, not a fallback.
7. **Boring technology.** Stability in a kitchen beats novelty (§12).
8. **Taste is subjective; extraction is not.** We are prescriptive about physics and descriptive about preference.

---

## 6. Scope overview — the eleven surfaces

| # | Surface | One-liner |
|---|---|---|
| S1 | **Brew** | The guided, step-driven timer that runs a recipe |
| S2 | **Recipes** | Library, builder, and versioning of brew methods |
| S3 | **Journal** | Every brew logged, scored, searchable, analysable |
| S4 | **Dial-in** | Diagnose a bad cup, get one change, converge |
| S5 | **Shelf** | Bean inventory, freshness, provenance, remaining dose |
| S6 | **Grinders** | Grinder registry, setting translation, particle model |
| S7 | **Water** | Water profiles, mineral recipes, mixing calculators |
| S8 | **Cupping** | SCA CVA + legacy form, flavour wheel, blind sessions |
| S9 | **Learn** | The knowledge base — the deep data (§8) |
| S10 | **Tools** | Ratio, EY/TDS, bypass, dilution, cold brew, and unit calculators |
| S11 | **Gear & Sync** | Devices, Bluetooth scales, export, account, settings |

---

## 7. Feature specifications

> Format: **User story → Requirements → Acceptance criteria.**
> Priority: `P0` = v1 launch blocker, `P1` = v1 desirable, `P2` = post-launch.

---

### F1 · Guided Brew Engine `P0`

> *As Maya, I want the app to talk me through the brew in real time so I never have to remember what comes next.*

#### F1.1 Step model

A recipe compiles to an ordered list of **steps**. Each step is one of:

| Step type | Fields | Behaviour |
|---|---|---|
| `prepare` | instruction, optional checklist | Untimed, user advances |
| `rinse` | water temp, volume | Untimed, optional skip |
| `dose` | mass, grind setting ref | Waits for scale stability or manual confirm |
| `bloom` | water mass, duration, agitation | Timed, target mass shown live |
| `pour` | water mass, start time, pour duration, pattern, kettle flow rate | Timed, live mass target + rate coaching |
| `wait` | duration or "until drawdown" | Timed or sensor/manual-terminated |
| `agitate` | type (`swirl` \| `stir` \| `Rao spin` \| `WDT` \| `plunge`), count/duration | Timed |
| `press` | duration, pressure hint | AeroPress / French press |
| `flip` | — | AeroPress inverted, Switch open/close |
| `drain` | expected drawdown window | Terminated by user or scale-flow detection |
| `serve` | target beverage mass, bypass water | Final measurement capture |

#### F1.2 Requirements

- **R1.** Large-format display: current instruction, elapsed time, **target mass now** vs **actual mass now**, next step preview.
- **R2.** Live pour guidance: a target-mass ramp (linear or curved per step) with visual "you are ahead / behind" indication; tolerance band configurable (default ±3 g).
- **R3.** Audio + haptic cues at step boundaries and at T−3 s. Voice prompts optional (offline TTS if available, else silent).
- **R4.** Screen wake-lock during an active brew (`navigator.wakeLock`).
- **R5.** Manual mode: everything works with taps if no smart scale is connected.
- **R6.** Pause / resume / rewind one step. Never lose an in-progress brew to a refresh — state persisted every tick.
- **R7.** Brew completion opens the **log capture** sheet (F3) pre-filled with everything the app already knows.
- **R8.** "Free pour" mode: no recipe, just a timer + scale trace, logged as an ad-hoc brew.
- **R9.** Deviations are recorded, not punished: if the user pours 512 g against a 500 g target, the log stores actuals and the recipe stores intent.

#### F1.3 Acceptance criteria

- [ ] A recipe with `bloom → 3 pours → drain → serve` renders as 6 steps and advances on time without user input.
- [ ] Killing and reopening the tab mid-brew restores elapsed time within 1 s.
- [ ] With airplane mode on, a full brew can be run and logged.
- [ ] Timer drift over a 5-minute brew is < 250 ms (monotonic clock, not `setInterval` accumulation).
- [ ] Every step is operable one-handed on a 360 px-wide viewport with 48 px minimum targets.

---

### F2 · Recipe Library & Builder `P0`

> *As Dimas, I want to store, fork, and version recipes per method and per bean.*

#### F2.1 Built-in canonical recipes (ships with app, offline)

| Method | Recipes shipped at launch |
|---|---|
| **Hario V60** | Hoffmann "Ultimate V60" · Tetsu Kasuya 4:6 (5 variants) · Rao/Perger 3-pour · continuous single-pour · Onyx classic · 5-pour pulse · one-cup · high-extraction long-bed |
| **Kalita Wave 155/185** | Classic 5-pour pulse · flat-bed high-yield · single-cup |
| **Chemex 3/6/8-cup** | Classic slow · blooming Chemex · half-batch |
| **Origami / April / Orea** | Flat-bottom pulse · cone-mode hybrid · high-flow fast recipe |
| **AeroPress** | Standard · inverted · "Ultimate" long-steep · championship-style bypass recipes (3) · Prismo/Flow-control · 1-minute quick · concentrate for iced |
| **French press** | No-plunge / skim-and-decant · classic 4-min · cold brew in press |
| **Clever / Hario Switch** | Switch hybrid 3-open-close · full immersion · immersion-percolation split · iced flash |
| **Siphon** | Classic Japanese · cloth vs metal filter variants |
| **Moka pot** | Pre-boiled-water method · classic stovetop · brikka |
| **Cold brew** | Immersion 1:8 concentrate (12–18 h) · Kyoto slow drip · Japanese iced (flash chill) for every dripper |
| **Turkish / ibrik** | Classic · sade / orta / şekerli sweetness levels |
| **Phin / Vietnamese** | Traditional · cà phê sữa đá |
| **Chorreador / cloth sock** | Costa Rican · Nicaraguan |
| **Percolator** | Stovetop · electric (documented, discouraged, honest about why) |

Each shipped recipe includes: attribution, source URL, the *intent* of each design decision, and a "what this recipe is optimising for" note (e.g. *clarity* vs *body* vs *sweetness* vs *forgiveness*).

#### F2.2 Recipe builder

- **R1.** Visual step sequencer: add / reorder / duplicate steps, drag to retime.
- **R2.** **Scaling engine.** Change dose or yield → all pours rescale by ratio, with non-linear rules where physics demands it:
  - Bloom water scales with dose (default 2–3× dose), **not** with total yield.
  - Bed depth changes with dose in a fixed-diameter cone → warn when a scaled dose exits the brewer's sane range.
  - Total time does **not** scale linearly; the engine applies a method-specific time model and flags scales outside the validated range.
- **R3.** Fork any recipe. Full version history with diff view ("v3 → v4: bloom 45 s → 30 s, grind −2 clicks").
- **R4.** Recipe *variables* (`dose`, `ratio`, `temp`, `grind`) can be bound to the bean or grinder, so opening a recipe with a different bean auto-substitutes remembered values.
- **R5.** Validation warnings, not blocks: "1:22 with a 45 s bloom on a dark roast will likely over-extract — proceed?"
- **R6.** Import/export a recipe as JSON, and as a printable one-page SOP card (for Arif's café).

#### F2.3 Acceptance criteria

- [ ] Scaling a 30 g / 500 g V60 recipe to 15 g / 250 g produces a coherent recipe with proportional bloom and a documented time adjustment.
- [ ] Forking, editing, and reverting preserves the ancestor chain.
- [ ] A recipe round-trips through JSON export/import with identical semantics.

---

### F3 · Brew Journal `P0`

> *As every persona, I want a log that is worth writing to because something reads it.*

#### F3.1 Capture

Post-brew sheet, everything optional except a score:

| Group | Fields |
|---|---|
| **Auto-filled** | recipe + version, bean, dose, actual water, actual time, temps, grinder + setting, water profile, ambient (if permitted), days off roast, brew index for this bag |
| **Sensory** | overall score (1–10 slider), quick tags (`sour` `bitter` `thin` `muddy` `sweet` `clean` `balanced` `astringent` `flat` `harsh`), flavour notes from the sensory lexicon (typeahead), free text |
| **Measured** | TDS %, beverage mass, calculated EY %, drawdown time, bed appearance photo |
| **Context** | who brewed, cup/vessel, drinking temperature, food pairing |

- **R1.** One-tap "same as last time" and "same as best brew for this bag".
- **R2.** Photo attachment (bed, cup, bag label) stored locally, compressed, optional sync.
- **R3.** Retroactive editing; a log entry is never immutable to its owner.

#### F3.2 Analysis

- **R4.** Per-bag timeline: score vs days off roast, with the degassing curve overlaid → shows the user *their own* peak window.
- **R5.** Variable-impact view: which single change historically moved this user's score most.
- **R6.** **Brew control chart**: strength (TDS %) on Y, extraction yield (%) on X, the SCA Golden Cup box drawn, every brew plotted, and the user's own preference centroid computed once ≥8 scored brews exist.
- **R7.** Streaks, totals, coffee consumed by origin / variety / process, "your year in coffee" summary.
- **R8.** Full-text + faceted search across all logs.
- **R9.** CSV / JSON export of the entire journal, always, no account required.

#### F3.3 Acceptance criteria

- [ ] 500 logged brews render the journal list in < 100 ms on a mid-range Android device.
- [ ] EY is auto-computed whenever TDS and beverage mass are present, using §9.1 with the LRR correction.
- [ ] The brew control chart renders correctly with zero, one, and 500 brews.

---

### F4 · Dial-in Assistant `P0`

> *As Dimas, I want a bad cup to produce exactly one next action.*

This is the product's differentiator. It is a **causal model**, not a lookup table.

#### F4.1 Diagnosis input

The user answers in plain language, or the app infers from the log:

1. **What is wrong?** `sour/sharp` · `bitter/harsh` · `thin/watery` · `muddy/heavy` · `dry/astringent` · `flat/dull` · `nothing wrong, want more of X`
2. **Optional evidence:** brew time vs expected, drawdown behaviour, bed appearance (flat / crater / high-and-dry / muddy pool), TDS, how it changes as it cools.

#### F4.2 Inference

The engine separates the two axes users constantly conflate:

| Axis | Question it answers | Primary levers |
|---|---|---|
| **Strength** (TDS) | "Too weak / too strong?" | Brew ratio, bypass, dilution |
| **Extraction yield** (EY) | "Under / over-extracted?" | Grind size, temperature, contact time, agitation, dose/bed geometry, water composition |

Diagnostic disambiguation the engine performs (worked examples):

- *Sour + short brew time + fast drawdown* → **under-extraction from too coarse a grind** → grind finer.
- *Sour + long brew time + slow drawdown* → likely **channelling / uneven bed**, not coarseness → fix pour technique and agitation before touching grind.
- *Bitter + astringent + long drawdown + muddy bed* → **over-extraction driven by fines and clogging** → coarser grind *and* less agitation, or a grinder-quality conversation.
- *Thin but not sour* → **strength problem, not extraction** → tighten the ratio; do not grind finer.
- *Flat and dull at correct EY* → water alkalinity too high, or bean too old, or temperature too low.
- *Great hot, harsh cold* → over-extraction masked by temperature; reduce yield slightly.

#### F4.3 Output

- **R1.** **Exactly one** recommended change, with magnitude expressed in the user's own grinder units (§F6): "Grind 3 clicks finer on your 1Zpresso J-Ultra (≈40 µm)".
- **R2.** An explicit prediction: "Expect drawdown to lengthen ~20 s and EY to rise ~1.5 %."
- **R3.** A **confirm loop**: the next brew is tagged as the test of this hypothesis; the user reports better/worse/same; the engine updates and either converges or proposes the next single change.
- **R4.** Convergence memory per bean: once converged, settings are saved to the bean and offered on the next bag from the same roaster/origin.
- **R5.** Expert mode: shows the full ranked hypothesis list with confidence, and permits multi-variable changes.
- **R6.** Every recommendation links to the Learn card explaining the mechanism (§8.7).

#### F4.4 Acceptance criteria

- [ ] Given "sour, 1:50 drawdown vs 3:00 expected", the engine recommends a finer grind and *not* a temperature change.
- [ ] Given "sour, 4:30 drawdown", the engine recommends technique/bed correction and explicitly declines to suggest a finer grind.
- [ ] Three consecutive "same" responses escalate to a different hypothesis rather than repeating.
- [ ] No recommendation is ever presented without a mechanism link.

---

### F5 · Bean Shelf `P0`

> *As Rina, I want the bag to be a first-class object with everything the roaster printed and everything they didn't.*

#### F5.1 Bean record

| Group | Fields |
|---|---|
| **Identity** | name, roaster, roaster country, lot/batch ID, purchase date, price, size (g), remaining (g) |
| **Provenance** | producing country, region, sub-region, farm / washing station / co-op, producer name, altitude (m or band), harvest year, plot/lot |
| **Botany** | species, variety/varieties with % blend split (linked to §8.2) |
| **Processing** | method + sub-method, fermentation details (time, vessel, temperature, inoculant), drying method + duration, milling (dry / wet-hulled) |
| **Roast** | roast date, roast level (descriptor + Agtron if known), roaster's stated development notes, decaf method if applicable |
| **Trade** | grade (e.g. Kenya AA, Ethiopia G1, Colombia Supremo), published cup score, certification (organic, FT, RA), import channel, "relationship coffee" flag |
| **Sensory** | roaster's tasting notes, the user's own notes, linked cupping sessions |
| **Derived** | days off roast, freshness state, estimated density band, suggested starting recipe, grind offset vs the user's baseline |

#### F5.2 Requirements

- **R1.** **Label capture:** photograph a bag → OCR → structured field suggestions the user confirms. A fully offline manual path must exist; OCR is enhancement, not dependency.
- **R2.** **QR/URL import:** if a roaster publishes a machine-readable lot page, ingest it.
- **R3.** **Freshness model** with method-specific windows (§9.4): `resting` → `peak` → `good` → `fading` → `stale`, plotted, adjustable from the user's own log data.
- **R4.** Remaining-dose tracking auto-decremented by each logged brew; "you have 3 brews left" and a low-stock nudge.
- **R5.** Enrichment: unknown fields filled with *typical values for this variety / origin / process*, clearly marked as inferred, never as fact.
- **R6.** Bean archive with a "would buy again" verdict, so the shelf becomes a purchase history worth consulting.
- **R7.** Blends: a bean can be composed of component beans with percentages, each with its own provenance.

#### F5.3 Acceptance criteria

- [ ] A bean can be created with only a name and a roast date, and still receive a starting recipe.
- [ ] Setting variety = Gesha and process = washed surfaces variety- and process-derived brewing implications, labelled *inferred*.
- [ ] Remaining grams never goes negative; brewing with insufficient stock warns but permits.

---

### F6 · Grinder Registry & Grind Translation `P0`

> *As Dimas, I want "2 clicks finer" to mean something across my three grinders.*

#### F6.1 Grinder database

Ships with a curated dataset of common home and café grinders:

- **Hand:** 1Zpresso (JX, JX-Pro, J-Ultra, K-Ultra, K-Max, X-Ultra, ZP6), Comandante (C40 MK3/MK4, Red Clix), Timemore (C2, C3, X-Lite, Sculptor 064/078), Kingrinder (K4, K6), Hario Skerton/Mini, Knock Aergrind/Feldgrind, Orphan Espresso Lido.
- **Electric:** Baratza (Encore, Encore ESP, Virtuoso+, Vario, Sette, Forté), Fellow Ode Gen 1/Gen 2 (± SSP burrs), Wilfa Uniform/Svart, Eureka Mignon/Filtro, DF64 / DF64 Gen2 / DF64P, Option-O Lagom P64/Mini, Weber Key/EG-1, Mahlkönig X54/EK43/EK43S/E65, Ditting 807/KR804, Niche Zero/Duo.

Per grinder we store: burr type (conical / flat), burr diameter, burr geometry where notable (e.g. SSP MP/HU), adjustment mechanism (stepped / stepless), **µm per click or step** where credibly published or community-measured, usable filter range, known quirks (retention, popcorning, alignment sensitivity), and a **confidence rating on the µm figure**.

#### F6.2 Translation

- **R1.** Convert a setting between grinders via a common **µm midpoint** estimate — always presented as a *starting point with uncertainty*, never as an exact equivalence. Show the uncertainty band explicitly.
- **R2.** Method-appropriate ranges per grinder ("V60 typically 28–34 clicks on your C40; you are at 24 — unusually fine").
- **R3.** Personal calibration: the user records "my V60 setting is X" per grinder; all app suggestions then become **relative deltas from the user's own baseline**, which is far more robust than absolute µm claims.
- **R4.** Optional particle-distribution notes: conical vs flat tendency, fines generation, and what that implies for the recipe (more fines → shorter contact time or less agitation).
- **R5.** Sieve/Kruve distribution data entry for users who measure it (`P2`).
- **R6.** RDT (Ross Droplet Technique) toggle recorded on the brew, since it materially changes static and fines behaviour.

#### F6.3 Acceptance criteria

- [ ] Translating "C40 @ 30 clicks" to a Fellow Ode Gen 2 returns a range with a stated confidence, not a single number.
- [ ] After a user sets their own baseline, all dial-in advice is expressed in their grinder's native units.
- [ ] A grinder not in the database can be added manually with a custom unit label and step count.

---

### F7 · Water Lab `P0`

> *As Rina, I want to build water; as Maya, I want to know if my tap water is the problem.*

#### F7.1 Water profiles

- **R1.** Store named profiles: TDS (mg/L), general hardness (GH, ppm as CaCO₃), carbonate hardness / alkalinity (KH, ppm as CaCO₃), calcium : magnesium split, sodium, chloride, sulfate, pH, source (tap / filtered / bottled / built).
- **R2.** Ship a reference set: **SCA target profile**, common bottled waters by region, RO/distilled baseline, and published enthusiast recipes (Appendix D).
- **R3.** Tap-water intake: user enters their utility's published values, a test-kit result, or a TDS-meter number — with an honest explanation of what a TDS meter does and does not tell them.

#### F7.2 Builder & calculators

- **R4.** **Concentrate solver:** given a target profile and available salts (Epsom MgSO₄·7H₂O, calcium chloride CaCl₂·2H₂O, gypsum CaSO₄·2H₂O, sodium bicarbonate NaHCO₃, potassium bicarbonate KHCO₃), compute grams-per-litre of concentrate and mL-of-concentrate-per-litre of brew water. Show the resulting GH/KH/TDS and flag deviations from the SCA acceptable range.
- **R5.** **Blend calculator:** mix tap / bottled / distilled in ratio X to land on a target hardness.
- **R6.** **Commercial packet support:** Third Wave Water, Lotus Water, and similar — dose per litre and resulting profile.
- **R7.** Water is attached to every brew log, so the journal can attribute a change to water.
- **R8.** Safety and equipment notes: limescale risk above a given hardness, why RO water alone is a bad idea (flat, corrosive, poor extraction), and clear warnings against drinking mis-mixed concentrates.

#### F7.3 Knowledge integration

Each ion gets a Learn card explaining its actual role:

| Ion | Role in extraction | Too little | Too much |
|---|---|---|---|
| **Mg²⁺** | Strong binding of flavour compounds; brightness and fruit | Thin, hollow | Harsh, sharp |
| **Ca²⁺** | Extraction of heavier, creamy compounds; body | Lacks body | Chalky; scale in equipment |
| **HCO₃⁻ (alkalinity)** | Buffers acids — the "volume knob" on perceived acidity | Sharp, aggressive, sour | Flat, dull, chalky, muted |
| **Na⁺** | Enhances perceived sweetness at low levels | — | Salty, soapy |
| **Cl⁻ / SO₄²⁻** | Anion pairing affects mouthfeel and corrosion | — | Corrosion risk (Cl⁻), dryness (SO₄²⁻) |

#### F7.4 Acceptance criteria

- [ ] Given a target of GH 68 / KH 40 ppm and Epsom + bicarbonate as inputs, the solver returns a mix whose recomputed profile is within 5 % of target.
- [ ] Entering a hard tap water (GH 250, KH 180) produces a specific, actionable warning tied to flat-tasting coffee and scale.
- [ ] Every profile can be duplicated and edited; the SCA reference profile is read-only.

---

### F8 · Cupping & Sensory `P1`

> *As Arif, I want to run a proper cupping session and score it the way the industry now does.*

- **R1.** **CVA (Coffee Value Assessment)** support — the current SCA standard: separate **descriptive** assessment (intensity + attribute selection from the lexicon) and **affective** assessment (9-point impression-of-quality scales) across fragrance/aroma, flavour, aftertaste, acidity, sweetness, mouthfeel, and overall; plus physical and extrinsic assessment fields where the user has them.
- **R2.** **Legacy SCA 100-point form** retained, because most of the world's published scores use it: fragrance/aroma, flavour, aftertaste, acidity, body, balance, uniformity, clean cup, sweetness, overall, minus defects (taint ×2 / fault ×4).
- **R3.** **Flavour wheel + sensory lexicon** as a navigable, searchable picker: three tiers (broad → specific → most specific), each leaf attribute with its definition and, where defined, its reference standard.
- **R4.** Multi-sample, multi-cupper sessions; blind mode with randomised cup order and reveal at the end; per-cupper aggregation and deviation flagging.
- **R5.** Triangulation test mode (pick the odd cup) for calibration and training.
- **R6.** Session export as a scoresheet PDF/CSV.
- **R7.** Cupping notes link back to the bean record and forward into brew recommendations.

**Acceptance criteria**

- [ ] A 6-sample, 3-cupper blind session can be run end-to-end offline and exported.
- [ ] Legacy and CVA scores are stored distinctly and never silently converted into one another.
- [ ] Every lexicon attribute displays its definition on tap.

---

### F9 · Calculators & Tools `P0`

Small, fast, no-account tools — also the SEO front door.

| Tool | Function |
|---|---|
| **Ratio** | dose ↔ water ↔ yield, distinguishing brewing water from beverage mass, with absorption (LRR) accounted for |
| **EY / TDS** | Extraction yield from TDS + masses; reverse-solve for a target TDS |
| **Brew control chart** | Plot a brew against Golden Cup and against the user's own preference zone |
| **Bypass / dilution** | Strong-brew-plus-water solver (AeroPress, Switch, café style) |
| **Cold brew** | Concentrate ratio, steep time, dilution at serve, yield per batch |
| **Japanese iced** | Splits total water into hot brew water and ice mass, preserving final strength |
| **Scaling** | Recipe up/down with the non-linear guards from F2.2 |
| **Temperature** | Kettle-to-slurry drop estimate by ambient, vessel, and preheat; altitude-adjusted boiling point |
| **Caffeine** | Estimated caffeine per cup by species, dose, method, and extraction — with an explicit uncertainty range |
| **Degassing** | CO₂ off-gassing curve by roast level and packaging |
| **Unit converter** | g ↔ oz ↔ mL, °C ↔ °F, masl ↔ ft, screen size ↔ mm, Agtron ↔ common roast descriptors |

**Acceptance criteria**

- [ ] Each tool is reachable in one tap from a Tools index and works with no account, no bean, and no network.
- [ ] Every calculator exposes its formula and assumptions in a "how this works" expander.

---

### F10 · Hardware Integration `P1`

- **R1.** **Smart scales:** live mass + flow rate + auto-tare + auto-start. Target support: Acaia (Pearl/Lunar/Pyxis), Bookoo Themis, Timemore Black Mirror, Felicita, DiFluid Microbalance. Two abstraction layers, both mandatory: a **transport interface** (Web Bluetooth in the browser, native BLE in the Capacitor shell — see §18) and a **protocol adapter** per scale model above it. New scales are additive; new platforms are additive. Neither layer may leak into the brew engine.
- **R2.** **Refractometer entry:** manual for all; direct connection for DiFluid R2 where the API permits (`P2`).
- **R3.** **Kettle awareness:** no control (out of scope) but temperature entry, and read-only integration where an open API exists (`P2`).
- **R4.** Graceful, loud failure: Web Bluetooth is unavailable in iOS Safari — the app must state this plainly and route the user to manual mode rather than appearing broken.
- **R5.** The scale trace is stored with the brew: a mass-over-time curve is the highest-value diagnostic artefact we can capture, and it powers drawdown and flow-rate analysis.

**Acceptance criteria**

- [ ] A supported scale connects, tares, and streams mass into the brew engine within 5 s.
- [ ] Disconnection mid-brew falls back to manual without losing the brew.
- [ ] On an unsupported browser, the Bluetooth affordance is hidden and explained, not shown-and-broken.

---

### F11 · Learn — the knowledge base `P0`

Specified in full in **§8**. Requirements at the app level:

- **R1.** Every knowledge entity is a first-class, linkable, searchable record — not a blog post.
- **R2.** **Contextual entry:** knowledge is reached from a bean ("what is a Pacamara?"), from a recommendation ("why does grind change extraction?"), and from search — in that order of priority.
- **R3.** Reading depth toggle: **Quick** (2 sentences + the practical implication) · **Standard** · **Deep** (mechanism, contested points, sources).
- **R4.** Fully offline, bundled at install; updated by content patches.
- **R5.** Cross-linking is mandatory: a variety links to its parents, its typical processes, its origins, its sensory profile, and to beans on the user's own shelf.
- **R6.** Every card carries: last-reviewed date, source list, and a confidence label (`established` · `emerging` · `contested` · `folklore, disputed`).

---

### F12 · Sharing & Community `P2`

- Share a recipe or a brew as a public read-only link with a rendered card.
- Import a shared recipe into your own library (forks, with attribution preserved).
- Café/team spaces: a shared recipe set with house standards (Arif).
- **Explicitly not in v1:** feeds, follows, comments, likes, public profiles.

---

### F13 · Accounts, Sync, Privacy `P0`

- **R1.** **Local-first.** The app is fully functional with no account. All data lives in the browser.
- **R2.** Optional account for multi-device sync and backup. Email + passkey/OAuth; no password storage of our own if avoidable.
- **R3.** Conflict resolution: last-write-wins per record with an entity-level change log; brews are append-only, so conflicts are rare by design.
- **R4.** One-click **export everything** (JSON + CSV + photos as a zip) and **delete everything**.
- **R5.** No third-party analytics SDKs; first-party, aggregate, opt-out product analytics only. No ad networks. No selling data. Stated in-app in plain language.

---

## 8. The knowledge base — deep data model

> This is the substance of the product. It is a **graph of typed entities**, authored as structured data with prose fields — not a CMS of articles.

### 8.0 Entity types

`Species` · `Variety` · `ProcessingMethod` · `FermentationTechnique` · `Origin` (country → region → sub-region → farm) · `GradingSystem` · `Defect` · `RoastConcept` · `BrewMethod` · `Brewer` (device) · `Filter` · `Grinder` · `WaterConcept` · `ExtractionConcept` · `SensoryAttribute` · `Compound` · `Person` · `Term` · `Standard`

Every entity carries: `id`, `name`, `aliases[]`, `summary` (≤2 sentences), `practicalImplication` (what it changes about *your brew*), `body` (tiered), `relations[]`, `sources[]`, `confidence`, `lastReviewed`.

---

### 8.1 Botany — species

| Species | Notes to capture |
|---|---|
| **Coffea arabica** | Allotetraploid (44 chromosomes), a natural hybrid of *C. canephora* × *C. eugenioides*, originating in south-west Ethiopia; roughly 60 % of world production; self-pollinating; narrow genetic base outside Ethiopia; lower caffeine (~1.2–1.5 %), higher lipids and sugars |
| **Coffea canephora (Robusta)** | 22 chromosomes; cross-pollinating; higher caffeine (~2.2–2.7 %), higher chlorogenic acids, lower lipids and sugars; disease- and heat-tolerant; fine robusta is a real and growing category with its own Q system |
| **Coffea eugenioides** | An arabica parent; very low caffeine; rare, expensive, prized for sweetness; almost exclusively competition coffee |
| **Coffea liberica** | Large cherries and beans; distinctive jackfruit / smoky / savoury profile; significant in the Philippines (Barako) and Malaysia |
| **Coffea liberica var. dewevrei (Excelsa)** | Treated commercially as its own thing; tart, dark-fruited, often blended for complexity |
| **Coffea stenophylla** | Rediscovered West African species; heat-tolerant; reported arabica-like quality; a climate-adaptation story worth documenting |
| **Coffea racemosa** | Low caffeine, drought-tolerant, Mozambique; research interest |

Each species card covers caffeine, chlorogenic acid, lipid and sugar content, ideal altitude and temperature, disease susceptibility, cup character, and **what it implies for brewing** — e.g. robusta's higher chlorogenic acid and lower solubility of desirable compounds argue for shorter contact, coarser grind, and cooler water.

---

### 8.2 Botany — varieties (the deep table)

Each variety record: `lineage` (parents, with a rendered family tree), `mutationOf`, `year / place of identification`, `plantStature` (dwarf / tall), `beanSize`, `yieldPotential`, `optimalAltitude`, `leafTipColour` (bronze / green — a real field-ID trait), `diseaseResistance` (leaf rust, CBD, nematodes), `cupPotential`, `typicalOrigins[]`, `typicalProcesses[]`, `sensoryProfile`, `brewingImplications`, `notes`.

**Coverage at launch (≥ 90 varieties), grouped:**

**Typica lineage** — Typica · Blue Mountain · Kona Typica · Kents · Sumatra Typica · Maragogipe (Typica mutation, giant bean, Brazil) · Pache Comum (Typica mutation, Guatemala) · Pache Colis (Pache Comum × Caturra) · Villalobos · Criollo · San Ramón · Mokka (dwarf, very small bean)

**Bourbon lineage** — Red / Yellow / Orange / Pink Bourbon · Caturra (single-gene dwarf mutation of Bourbon, Minas Gerais, Brazil, ~1915–1918) · Pacas (Bourbon mutation, El Salvador, 1949) · Villa Sarchi (Bourbon mutation, Costa Rica) · Tekisic (improved Bourbon, El Salvador) · Jackson · Mibirizi · **SL28** (Scott Agricultural Laboratories, Kenya, 1930s; drought-tolerant, rust-susceptible — the blackcurrant coffee) · **SL34** (French Mission / Bourbon-related, Kenya; tolerates rain and a wider altitude range) · **Laurina / Bourbon Pointu** (Réunion; naturally about half the caffeine; delicate) · N39 · K7

**Bourbon × Typica crosses** — Mundo Novo (Bourbon × Sumatra Typica, Brazil, 1940s; vigorous, high-yielding) · Catuaí (Mundo Novo × Caturra, IAC Brazil; red and yellow; compact, wind-resistant) · **Pacamara** (Pacas × Maragogipe, El Salvador, 1958; huge beans, polarising, capable of extraordinary cups) · Maracaturra (Maragogipe × Caturra)

**Ethiopian landraces and selections** — the "heirloom" label is a marketing simplification, and the knowledge base must say so. Cover: JARC/Jimma released selections (the **7411x series** — 74110, 74112, 74140, 74148, 74158, 74165 — selected for coffee berry disease resistance), regional landrace groups (**Kurume, Dega, Wolisho** in Yirgacheffe and Sidama), **Gesha / Geisha** (collected from the Gori Gesha forest in the 1930s; distributed via CATIE as T2722; made famous in Panama in 2004), **Wush Wush**, **Sidra** (Ecuador / Colombia — disputed lineage, likely Bourbon/Typica-related rather than truly Ethiopian), **Chiroso** (Antioquia, Colombia — genetically Ethiopian-derived, not the Caturra mutation it is often claimed to be), **Java** (Ethiopian-origin, travelled via Indonesia and Cameroon to Central America; long slender bean, CBD-tolerant)

**Kenya-specific** — SL28 · SL34 · K7 · **Ruiru 11** (1985; compound hybrid; rust- and CBD-resistant; historically criticised on cup) · **Batian** (2010; taller, improved cup relative to Ruiru 11, disease-resistant)

**Introgressed / rust-resistant (Timor Hybrid lineage)** — **Híbrido de Timor (HdT)** (a natural arabica × canephora hybrid found in Timor) → the **Catimor** family (HdT × Caturra: Costa Rica 95, T5175, T8667, Lempira, IHCAFE 90) · the **Sarchimor** family (HdT × Villa Sarchi: T5296, Obatã, IAPAR 59, Limani, Marsellesa, Cuscatleco, Parainema) · **Colombia** (1982) · **Castillo** (Cenicafé, 2005, plus its regional selections) · **Cenicafé 1** (2016) · **Tabi** (Colombia: Typica × Bourbon × HdT) · **Anacafé 14** (Guatemala) · **Icatu** (Brazil; canephora × Bourbon, backcrossed to arabica) · Tupi · Obatã Vermelho

**F1 hybrids (modern breeding)** — **Centroamericano (H1)** (Sarchimor T5296 × Rume Sudan) · **Milenio (H10)** · **Mundo Maya (H16)** · **Evaluna** · **Casiopea** (Caturra × Ethiopia) · **Starmaya** (the first F1 propagated by seed, via male sterility) · **Nayarita** · **H3** — each with an honest note on the cost of vegetative propagation and why F1s matter for climate adaptation

**Other notables** — Rume Sudan · Barbuk Sudan · Bergendal and Sidikalang (Indonesian Typica survivors) · Ateng · Tim Tim · S795 (India) · Kent (India) · Selection 9 (India) · Chandragiri · Yellow Icatu · Aramosa · Arara (Brazil) · Bourbon Sidra · Wolishalo

**Every variety card ends with `brewingImplications`.** Examples of the standard we hold ourselves to:

- **Gesha (washed):** extremely aromatic and delicate — favour lower agitation, moderate temperature (92–94 °C), and a wider ratio (1:16–1:17) to preserve florality; over-extraction ruins it faster than most varieties.
- **SL28 (washed, Kenyan):** dense, high-acid, blackcurrant and tomato-leaf; tolerates and often rewards hotter water (95–96 °C) and a finer grind; frequently under-extracted by beginners who mistake its acidity for sourness.
- **Pacamara:** very large and uneven bean size → uneven grind; consider sifting, or a coarser setting with longer contact; the profile swings from herbaceous to intensely sweet by lot.
- **Catimor / Castillo lineage:** historically maligned; modern selections grown at altitude cup well but often carry less aromatic complexity — brew for body and sweetness rather than clarity.

---

### 8.3 Processing

Each `ProcessingMethod` record: mechanism, typical duration, equipment, regional prevalence, effect on the bean (density, moisture, sugar retention), **cup impact**, defect risks, roasting implications, and brewing implications.

| Family | Methods to document |
|---|---|
| **Washed** | Fully washed (wet fermentation) · double-washed / **Kenyan** (ferment, wash, then a clean-water soak) · mechanical demucilaging · Colombian traditional tank · low-oxygen washed · enzyme-assisted |
| **Natural / dry** | Full natural on raised beds · patio-dried · Brazilian mechanical drying · Ethiopian raised-bed 14–21 day · "clean natural" vs deliberately fermented natural |
| **Honey / pulped natural** | White (~10–20 % mucilage) · yellow (~25–50 %) · red (~50–75 %) · black (~100 %, slow, shaded) · country-specific "miel" terminology · Brazilian *cereja descascada* |
| **Wet-hulled** | **Giling basah** (Sumatra; hulled at ~30–35 % moisture) — why it produces the earthy, herbal, low-acid profile and its characteristic blue-green bean |
| **Anaerobic / controlled fermentation** | Sealed-tank anaerobic (cherry or depulped) · CO₂-flushed · pressure-monitored · **carbonic maceration** (whole cherry in a CO₂-saturated vessel, borrowed from winemaking) · **lactic** (LAB-dominant, low pH, dairy notes) · **thermal shock** (hot/cold cycling) · **extended fermentation** (72–200+ h) · double fermentation |
| **Inoculated** | Commercial yeast strains · selected lactic acid bacteria cultures · **koji** (*Aspergillus oryzae*) · fruit / must co-fermentation — including an honest section on where "co-ferment" becomes flavouring, and the industry's disclosure debate |
| **Drying** | Raised African beds · patio · mechanical (guardiola) · solar / parabolic dryer · shade-drying · the 10–12 % moisture target and why over- or under-drying wrecks stability |
| **Post-drying** | Resting in parchment · dry milling · hulling · polishing · density sorting · screen sorting · colour sorting · hand sorting |
| **Decaffeination** | **Swiss Water** (carbon-filtered green coffee extract, solvent-free) · **Mountain Water** (Mexico) · **supercritical CO₂** · **ethyl acetate / "sugarcane" EA** (Colombia) · **methylene chloride** · plus the effect on roast behaviour (faster, darker-looking, brittle) and the brew adjustment it demands (coarser, cooler, shorter) |

**Cup impact table (shipped as data, shown as a comparison view):**

| Process | Acidity | Body | Sweetness | Fruit intensity | Clarity | Consistency risk |
|---|---|---|---|---|---|---|
| Washed | High, clean | Light–medium | Moderate | Low–moderate, "true to variety" | Highest | Low |
| Honey (red/black) | Medium | Medium–full | High | Medium–high | Medium | Medium |
| Natural | Lower, rounder | Full | Very high | High, jammy | Lower | High |
| Anaerobic natural | Variable, often unusual | Full | Very high | Very high, sometimes boozy or funky | Low | High |
| Carbonic maceration | Distinctive, wine-like | Medium–full | High | High; cinnamon, tropical | Medium | High |
| Lactic | Soft, creamy acidity | Full | High | Medium; dairy, yoghurt | Medium | High |
| Wet-hulled | Very low | Very full, syrupy | Moderate | Low; earthy, herbal, cedar | Low | Medium |

Plus **brewing implications** per process, for example:

- **Naturals and anaerobics** are typically less dense and more soluble: start one or two clicks coarser than a washed coffee at the same roast level, expect faster extraction, and remember that fermented notes intensify with over-extraction.
- **Washed Kenyans and Ethiopians** grown at high altitude are dense: grind finer and brew hotter than instinct suggests.
- **Wet-hulled Sumatran** rarely rewards a high-clarity pourover; it shines in immersion and heavier-bodied methods.

---

### 8.4 Origin & terroir

`Origin` is hierarchical: **country → region → sub-region → washing station / farm / co-op**.

Per country: harvest calendar, typical altitudes, dominant varieties, dominant processing, grading system, cup signature, smallholder vs estate structure, key certifications, arrival season in consuming markets, and current issues (climate, price, leaf rust, labour).

**Coverage at launch:**

- **Africa** — Ethiopia (Yirgacheffe, Sidama, Guji, Harrar, Limu, Jimma, Kaffa, Bench Maji, Gedeo; the ECX and the shift back toward traceability), Kenya (Nyeri, Kirinyaga, Murang'a, Embu, Kiambu, Machakos; the auction system and the factory / washing-station model), Rwanda (Huye, Nyamasheke; the potato defect and its cause — antestia bug damage and bacterial infection), Burundi (Kayanza, Ngozi), Tanzania (Mbeya, Kilimanjaro, Kigoma), Uganda (Mt Elgon arabica, Rwenzori robusta), DR Congo (Kivu), Malawi, Zambia, Zimbabwe, Côte d'Ivoire, Cameroon
- **Central America & Mexico** — Guatemala (Antigua, Huehuetenango, Atitlán, Cobán, Fraijanes, San Marcos, Nuevo Oriente, Acatenango), Costa Rica (Tarrazú, West Valley, Central Valley, Tres Ríos, Brunca, Turrialba, Orosi; the micromill revolution), Honduras (Copán, Opalaca, Montecillos, Comayagua, El Paraíso, Agalta), El Salvador (Apaneca-Ilamatepec, Alotepec-Metapán, Chichontepec; Bourbon-dominant), Nicaragua (Jinotega, Matagalpa, Nueva Segovia), Panama (Boquete, Volcán-Candela, Piedra de Candela; the Best of Panama auction and Gesha economics), Mexico (Chiapas, Veracruz, Oaxaca, Puebla)
- **South America** — Colombia (Huila, Nariño, Cauca, Tolima, Antioquia, Quindío, Risaralda, Caldas, Santander, Sierra Nevada; two harvests a year, the FNC, Castillo adoption), Brazil (Cerrado Mineiro, Sul de Minas, Mogiana, Matas de Minas, Espírito Santo, Bahia; mechanised harvest, pulped natural, sheer scale), Peru (Cajamarca, Amazonas, Cusco, Puno), Ecuador (Loja, Pichincha; Sidra and Typica Mejorado), Bolivia (Caranavi), Venezuela
- **Asia & Oceania** — Indonesia (Sumatra: Gayo, Lintong, Mandheling; Java: Ijen; Sulawesi: Toraja; Bali: Kintamani; Flores: Bajawa; Papua), Vietnam (Central Highlands robusta, Đà Lạt arabica, the specialty shift), India (Karnataka, Kerala, Tamil Nadu; monsooned Malabar as a deliberate process), Papua New Guinea (Eastern Highlands, Sigri), Timor-Leste, China (Yunnan), Thailand (Chiang Rai, Doi Chaang), Laos (Bolaven), Myanmar, Philippines (Benguet, Sagada; Barako), Australia, Hawaii (Kona, Ka'u; and the Kona-blend labelling controversy), Puerto Rico, Jamaica (Blue Mountain), Dominican Republic, Haiti, Cuba, Yemen (Haraaz, Bura'a, Matari — the world's oldest commercial coffee culture and its modern revival)

**Terroir factors documented as their own concept cards:** altitude → bean density → slower maturation → concentration of acids and sugars; latitude and shade; rainfall pattern and harvest timing; soil (volcanic origin, mineral content); diurnal temperature swing; cultivar–environment interaction; and — with appropriate caution — the limits of terroir claims relative to processing and roast.

---

### 8.5 Grading, defects, and quality standards

- **SCA green grading:** specialty grade requires **zero Category 1 defects and no more than 5 Category 2 defects in a 350 g sample**, moisture of 10–12 %, screen-size uniformity, **zero quakers in a 100 g roasted sample**, and a cup score of 80 or above. Premium and lower grades are defined for contrast.
- **Category 1 defects:** full black · full sour · dried cherry / pod · fungus damaged · foreign matter · severe insect damage
- **Category 2 defects:** partial black · partial sour · parchment · floater · immature / unripe · withered · shell · broken / chipped / cut · hull / husk · slight insect damage
- **Cup faults and taints:** phenolic · rioy / iodine · over-fermented · musty / mouldy · earthy · baggy · potato (Rwanda and Burundi) · rubbery (robusta) · quaker (visible after roast, under-ripe, tastes of cardboard and peanut)
- **Producing-country grading systems**, each explained in terms of what it does and does not tell you about quality:
  - **Ethiopia:** G1–G5 (defect-count based, plus the cupping layer)
  - **Kenya:** AA / AB / PB (peaberry) / C / E (elephant) / TT / T / MH-ML — **screen size, not quality**, and the knowledge base says so explicitly
  - **Colombia:** Supremo (screen 17/18) / Excelso (14–16) — again size, not quality
  - **Central America:** SHB / SHG (Strictly Hard Bean / Strictly High Grown), HB, SH, EPW, PW — altitude proxies, with country-specific altitude bands
  - **Brazil:** NY 2–8 defect grades plus cup classification (Strictly Soft → Rioy) plus screen size
  - **Indonesia:** Grade 1–6 by defect count
  - **India:** Plantation A/B/C, Cherry, Monsooned Malabar AA
- **Peaberry:** what it actually is (a single seed in the cherry, roughly 5 % of a crop) and the honest verdict on whether it tastes better — it roasts differently, which is the defensible claim
- **Q Grader system:** what the certification means, Q Arabica vs Q Robusta, and calibration
- **Coffee Value Assessment:** the replacement for the 2004 cupping form, its four components (descriptive, affective, physical, extrinsic), and why the industry moved

---

### 8.6 Roast

- **Stages:** drying (endothermic) → yellowing → **Maillard reaction** (amino acids + reducing sugars → melanoidins, browning, body) → **caramelisation** (sugar pyrolysis; sweetness, then its loss) → **first crack** (≈196–205 °C bean temperature; moisture flash; exothermic; audible) → **development** → **second crack** (≈224–230 °C; cellular fracture; oil migration)
- **Metrics:** charge temperature, turning point, drying / Maillard / development phase ratios, **development time ratio (DTR)** and why 18–25 % is a common target — with the caveat that DTR alone is not quality — rate of rise (RoR), crash and flick
- **Colour measurement:** the **Agtron Gourmet** scale (whole bean vs ground; ground reads lower), typical bands — very light ≈95–85, light ≈85–75, medium-light ≈75–65, medium ≈65–55, medium-dark ≈55–45, dark ≈45–35, very dark below 35 — plus SCA colour discs, and the difference between surface and ground colour as an indicator of development
- **Roast defects:** baked (flat, papery, cereal — the most common and least recognised), underdeveloped / grassy, scorched, tipped, faced, roasty / burnt, uneven
- **What roast level does to brewing** — the practical payload:

| Roast level | Solubility | Density | CO₂ | Grind | Temp | Ratio | Time |
|---|---|---|---|---|---|---|---|
| Very light | Low | High | High | Finer | 94–96 °C | 1:15–1:16 | Longer |
| Medium | Medium | Medium | Medium | Baseline | 92–94 °C | 1:16–1:17 | Baseline |
| Dark | High | Low, brittle | Fast-releasing | Coarser | 85–90 °C | 1:15–1:17 | Shorter |

- **Degassing:** the CO₂ release curve, why light roasts need a longer rest (typically 7–21 days for filter; darks 2–7), how valve bags, vacuum, and freezing change it, and the correct way to freeze coffee (single-dose, airtight, grind from frozen, never refreeze)
- **Staling:** oxidation of lipids, loss of volatile aromatics, moisture and odour ingress — and why "roasted on" beats "best before"

---

### 8.7 Extraction science — the core mechanism cards

- **The two numbers.** **Strength (TDS %)** is how much dissolved coffee is in the water. **Extraction yield (EY %)** is what fraction of the ground coffee's mass dissolved. They are independent, and confusing them is the single most common beginner error.
- **Golden Cup.** The SCA targets EY **18–22 %**, TDS **1.15–1.35 %**, and a brewing ratio of about **55 g/L ± 10 %** — presented as a well-evidenced default, not a law, with a clear note that modern light roasts and many drinkers live happily outside it.
- **Solubility order (why sour precedes bitter).** Acids and fruity or floral aromatics dissolve first; sugars and browning products next; bitter, astringent, heavy compounds last. Under-extraction therefore tastes sour and thin; over-extraction tastes bitter, dry, and hollow — and *both* can read as "weak".
- **The seven levers**, each a card with mechanism, magnitude, direction, and side effects:

| Lever | Direction | Effect on EY | Side effects |
|---|---|---|---|
| **Grind size** | Finer | ↑↑ (surface area + slower flow) | Fines, clogging, channelling risk |
| **Temperature** | Hotter | ↑ | Raises solubility of everything, including bitter compounds |
| **Contact time** | Longer | ↑ | Diminishing returns; astringency at the tail |
| **Agitation** | More | ↑ | Fines migration, bed compaction, uneven drawdown |
| **Ratio** | More water per gram | ↑ EY, ↓ TDS | The classic strength / extraction trade |
| **Water composition** | Higher GH | ↑ | Alkalinity mutes acidity independently |
| **Bed geometry** | Deeper bed | ↑ contact, ↑ resistance | Method- and dose-dependent |

- **Channelling and evenness:** why an uneven bed under-extracts and over-extracts *simultaneously*, producing a cup that is sour and bitter at once; how to diagnose it from the spent bed (crater, high-and-dry ring, mud pool, visible channels).
- **Percolation vs immersion:** a continuously refreshed concentration gradient versus approach to equilibrium; why immersion is more forgiving and less clear; why hybrids (Switch, Clever) exist.
- **Filter media:** paper (bleached vs natural — always rinse natural; paper removes lipids and the diterpenes cafestol and kahweol), cloth (more body, hygiene burden), metal (most body and fines, least clarity), and how thickness and permeability change drawdown independently of grind.
- **Refractometry, honestly:** what a refractometer measures (refractive index → sucrose-equivalent → TDS estimate), sample preparation and filtering, temperature compensation, repeatability limits, the LRR correction for retained water, and why an EY number without a taste note is useless.
- **Compounds** as their own small cards: caffeine · chlorogenic acids and their lactones · trigonelline · quinic acid · citric, malic, acetic, lactic, and phosphoric acids (with the Kenyan phosphoric-acid brightness story) · sucrose and reducing sugars · melanoidins · lipids (cafestol, kahweol) · key volatile aromatics such as 2-furfurylthiol · Strecker aldehydes.

---

### 8.8 Grind & particle science

- Particle size distribution: the bimodal reality; fines versus boulders; why fines are both essential (body) and dangerous (astringency, clogging)
- Burr geometry: conical versus flat, unimodality claims examined, burr alignment, seasoning, wear, and when to replace
- Retention, popcorning, static, and the Ross Droplet Technique
- Sifting and sieving: what removing fines actually does to a cup, and an honest cost/benefit verdict
- A **method → grind range** reference table expressed both in µm and in "how it feels between your fingers", because most users have no µm reference

---

### 8.9 Brew method encyclopedia

Every `BrewMethod` card carries: mechanism (percolation / immersion / hybrid / pressure), invention and history, device variants and their material differences (glass, ceramic, plastic, metal — and the real thermal consequences), filter options, standard parameter ranges, what the method is *good at*, its failure modes, its canonical recipes, cleaning and maintenance, and a troubleshooting section.

Methods covered: V60 · Kalita Wave · Chemex · Origami · April · Orea · Fellow Stagg X/XF · Melitta · Bonmac/Beehouse · AeroPress (plus Prismo, flow-control caps, filter options, and the inverted debate) · French press · Clever Dripper · Hario Switch · Siphon / vacuum · Moka pot · Turkish / ibrik / cezve · Cold brew immersion · Kyoto slow drip · Phin · Chorreador / cloth sock / greca · Percolator · Nel drip · Espro press · Steeped bags · Instant (documented honestly, including modern specialty instant)

---

### 8.10 Sensory

- **Flavour wheel and sensory lexicon** as navigable data, with attribute definitions and reference standards
- **Basic tastes vs aromatics vs trigeminal sensations** — astringency and body are not tastes — and why users mislabel astringency as bitterness
- **Building a palate:** a structured tasting protocol, side-by-side comparison method, and the value of tasting something *wrong on purpose* — the app can generate deliberately over- and under-extracted reference brews as an exercise
- **Common confusions**, each a card: sour vs bitter · sour vs acidic (negative vs positive) · astringent vs bitter · thin vs under-extracted · smoky-from-roast vs smoky-from-process
- **Temperature and perception:** how a cup's profile legitimately changes from 70 °C to room temperature, and why professionals evaluate across that range

---

### 8.11 Equipment, history, industry, sustainability

- Kettles (gooseneck geometry, flow rate, temperature stability), scales (resolution, response time, why 0.1 g matters), servers, cloths, storage (valve bags, vacuum canisters, freezing protocol)
- History: Ethiopian origin narratives, and separating documented history from the Kaldi legend; Yemeni cultivation and the Mocha trade; Dutch and French plant transfers; the "three waves" framing and its critics
- Supply chain: producer → mill → exporter → importer → roaster → you; the C-price versus differentials versus the cost of production; "direct trade" as an unregulated term; the Specialty Coffee Transaction Guide as a transparency tool
- Certifications compared honestly: Fair Trade, Rainforest Alliance, organic, Bird Friendly — what each does and does not guarantee for a farmer's income
- Sustainability and climate: leaf rust (*Hemileia vastatrix*) epidemics, coffee berry borer range expansion, projected loss of suitable arabica land, shade systems, F1 hybrids and *stenophylla* as adaptation, water use in wet milling

---

## 9. Algorithms & models

### 9.1 Extraction yield

```
EY% = (TDS% × beverageMass_g) / doseMass_g

# Where beverage mass isn't measured, estimate it:
beverageMass_g = totalWater_g − (doseMass_g × LRR)

# LRR (liquid retained ratio) by method — defaults, user-overridable:
#   paper cone (V60/Kalita/Chemex): ~2.0 g water retained per g coffee
#   immersion, decanted (French press): ~2.1–2.2
#   AeroPress, pressed:                 ~1.7–1.9
```

Every EY figure displays its inputs and flags whether beverage mass was measured or estimated. Estimated EY is rendered visually distinct from measured EY.

### 9.2 Dial-in recommender

A small, inspectable rule engine — **not** a black box:

1. Build an evidence vector from the taste report, timings, drawdown, bed appearance, TDS (if any), bean age, roast level, process, and grinder characteristics.
2. Score candidate hypotheses (`too coarse`, `too fine`, `channelling`, `ratio wrong`, `temp too low`, `bean too fresh`, `bean stale`, `water alkalinity high`, `agitation excessive`, `grinder distribution poor`).
3. Pick the highest-scoring hypothesis **whose corrective action is cheapest and most reversible**.
4. Emit one action, its magnitude in the user's units, and a falsifiable prediction.
5. Record the outcome; downweight hypotheses that failed for this user / bean / grinder combination.

Rules are declarative data: versioned, exportable, human-readable. Users in expert mode can see and disagree with the whole ranking.

`ponytail: rule engine, not ML. Revisit only if logged outcomes across users show the rules losing to a fitted model — and keep the rules as the explanation layer either way.`

### 9.3 Recipe scaling

- Water masses scale with the dose ratio.
- Bloom = `clamp(2–3 × dose, method bloom bounds)`.
- Total brew time scales by a method-specific sublinear function of bed depth, not by mass.
- Out-of-range warnings fire when a scaled dose leaves the brewer's validated capacity band.

### 9.4 Freshness model

A per-roast-level curve over days-off-roast, method-adjusted (filter tolerates and often prefers older coffee than espresso), producing the states `resting / peak / good / fading / stale`. The generic curve is a starting prior; once a user has ≥6 scored brews on a bag it is blended with their own observed scores, so the app converges on *their* peak window rather than a chart's.

### 9.5 Grind translation

`setting → µm midpoint (grinder A) → same µm (grinder B) → nearest setting`, propagating and displaying uncertainty at every step. When the user has a personal baseline on both grinders, the app uses the **anchored delta** method instead, which is materially more reliable — and says so.

### 9.6 Assistive language features (optional, `P2`)

- Natural-language brew logging ("made a v60 with the Kenyan, tasted a bit sharp") → structured fields for confirmation.
- Tasting-note translation: bag notes → likely extraction targets.
- Knowledge Q&A **grounded strictly in the knowledge base**, citing knowledge cards, refusing to answer beyond them.

**Hard constraints:** no assistive feature may sit on a critical path; all must work offline-degraded; nothing generated is ever presented as a sourced fact.

---

## 10. Data model (abridged)

```ts
type Bean = {
  id: string; name: string; roaster: string;
  roastDate?: ISODate; purchaseDate?: ISODate;
  sizeG: number; remainingG: number;
  origin?: { country: string; region?: string; subRegion?: string;
             farm?: string; producer?: string; altitudeM?: [number, number] };
  varieties?: { varietyId: string; percent?: number }[];
  processId?: string;
  fermentation?: { technique?: string; hours?: number; vesselC?: number; inoculant?: string };
  roast?: { level?: RoastLevel; agtron?: { whole?: number; ground?: number } };
  grade?: string; certifications?: string[]; decaf?: DecafMethod;
  cupScore?: number; roasterNotes?: string[]; userNotes?: string;
  components?: Bean[];                          // blends
  derived: { daysOffRoast: number; freshness: FreshnessState;
             inferredFields: string[] };        // provenance of every guess
};

type Recipe = {
  id: string; name: string; methodId: string; brewerId?: string; filterId?: string;
  version: number; parentId?: string; author?: string; sourceUrl?: string;
  intent?: 'clarity' | 'body' | 'sweetness' | 'forgiveness' | 'balance';
  dose: { g: number }; ratio: number; waterTempC: number;
  grind: { label?: string; micronsEstimate?: number; grinderRef?: GrinderSetting };
  steps: Step[];
  validRange?: { minDoseG: number; maxDoseG: number };
  notes?: string;
};

type Brew = {
  id: string; startedAt: ISODateTime; recipeId?: string; recipeVersion?: number;
  beanId?: string; grinderId?: string; grindSetting?: string;
  waterProfileId?: string; brewerId?: string; filterId?: string;
  actual: { doseG: number; waterG: number; beverageG?: number;
            totalTimeS: number; drawdownS?: number; waterTempC?: number };
  scaleTrace?: { t: number; g: number }[];      // mass over time
  measured?: { tdsPct?: number; eyPct?: number; refractometer?: string };
  sensory?: { score?: number; tags?: string[]; lexiconAttrs?: string[]; notes?: string };
  dialIn?: { hypothesisId: string; action: string; outcome?: 'better' | 'worse' | 'same' };
  photos?: MediaRef[]; ambient?: { tempC?: number; humidityPct?: number };
};

type KnowledgeEntity = {
  id: string; type: EntityType; name: string; aliases: string[];
  summary: string;               // <= 2 sentences
  practicalImplication: string;  // what it changes about YOUR brew — required
  body: { quick: string; standard: string; deep?: string };
  relations: { type: RelationType; targetId: string; note?: string }[];
  sources: { title: string; url?: string; author?: string; year?: number;
             kind: 'peer-reviewed' | 'industry-standard' | 'book' | 'practitioner' | 'community' }[];
  confidence: 'established' | 'emerging' | 'contested' | 'folklore';
  lastReviewed: ISODate;
};
```

---

## 11. Content operations

- **Authoring format:** knowledge entities as MDX with frontmatter, in-repo, schema-validated in CI. Content is code and is reviewed like code.
- **Editorial rules:** every card must carry a `practicalImplication`. Cards without sources fail the build. Claims marked `contested` must present the disagreement rather than adjudicate it.
- **Review cadence:** annual review of every entity; immediate review when a standard changes.
- **Expert review:** at minimum one Q Grader and one working roaster review the botany, processing, grading, and roast sections before launch.
- **Attribution:** third-party recipes are credited with a link and reproduced only in parameter form, never as copied prose. Flavour wheel and lexicon usage follows the rights holder's licensing terms; if licensing blocks bundling, we ship our own structurally equivalent taxonomy and say so plainly.
- **Localisation-ready:** all content strings externalised. Launch in English; **Bahasa Indonesia** as the first target locale given the team and market.

---

## 12. Technical approach

`ponytail: boring stack on purpose — a kitchen app's job is to still work in 18 months.`

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js (App Router) + React + TypeScript** | One codebase, good SEO for tool and knowledge pages, PWA-capable |
| Styling | **Tailwind CSS** | No design-system project before there is a design |
| State | React state plus a thin store; **no** global state framework until one is demonstrably needed | YAGNI |
| Local data | **IndexedDB** via a minimal wrapper (`idb`) | The only browser store that fits photos and thousands of brews |
| Sync (P1) | Small REST API + Postgres, per-record change log | Boring, debuggable |
| Knowledge content | MDX + JSON in-repo, bundled at build | Offline by construction; no CMS to operate |
| Charts | One lightweight charting library, not three | The control chart and timelines are the only real needs |
| Hardware | **Web Bluetooth** in the browser; **native BLE via Capacitor** in the shipped app (§18). One transport interface, one adapter per scale | Feature-detected, always optional, platform-swappable |
| Packaging | **PWA at P0/P1; the same build wrapped in Capacitor from P2** (§18) | One codebase; keeps the SEO surface; buys native BLE and durable storage without a rewrite |
| Offline | Service worker: app shell + content precache, background sync for logs | Kitchen-grade offline is a P0 requirement |
| Testing | Unit tests on every calculator and the dial-in rule engine; one E2E happy path per method family | The maths is the product; it gets tested |
| Analytics | First-party, aggregate, opt-out | Privacy principle |
| A11y | WCAG 2.2 AA; large touch targets; full keyboard; reduced-motion; screen-reader-announced timer steps | Wet hands, dark kitchen, real people |

**Hard technical requirements**

- Brew timer drift < 250 ms over 5 minutes. **Elapsed time is computed from a persisted start timestamp, never from accumulated ticks** — iOS suspends backgrounded JavaScript, and a tick-accumulating timer silently loses the suspended interval. A timestamp diff on resume survives suspension, tab discard, and reload.
- Cold start to interactive on a mid-range Android over a 3G-equivalent connection: < 3 s.
- Full app + knowledge base installable footprint: target < 25 MB.
- Zero data loss on refresh, crash, or backgrounding during a brew.
- **Storage durability.** Call `navigator.storage.persist()` on first write. If persistence is denied, surface an export reminder every 30 brews and on any 14-day gap in use. Safari evicts script-writable storage after roughly 7 idle days for sites the user has not installed to the home screen; a lost 400-brew journal is unrecoverable and unforgivable. The Capacitor shell (§18) removes this class of risk entirely.

---

## 13. UX requirements

### 13.1 The brew screen (the one screen that must be perfect)

- Legible at arm's length across a kitchen counter.
- Nothing critical below the fold; no scrolling required mid-pour.
- High-contrast dark mode by default (dawn brewing is the common case).
- Every interactive element ≥ 48 px, spaced for damp fingertips.
- Ambient-noise-resilient: the visual state must be complete without sound.
- Landscape and portrait both supported.

### 13.2 Progressive disclosure

An explicit **depth setting** (`Simple` / `Standard` / `Nerd`), chosen at onboarding, changeable anytime, visible in settings — never inferred silently. Depth controls default field visibility and knowledge card verbosity. It never removes a capability, only its default prominence.

### 13.3 Onboarding

Under 60 seconds to first brew:

1. What are you brewing with? (device picker, images)
2. What are you brewing? (bean — skippable; "I don't know" is a valid answer)
3. How deep do you want to go? (depth setting)
4. → A recipe, ready to run.

No account. No email. No tour.

---

## 14. Success metrics

| Metric | Definition | v1 target |
|---|---|---|
| **Activation** | New user completes a guided brew in session 1 | ≥ 55 % |
| **Habit** | ≥ 3 brews logged in the first 7 days | ≥ 35 % |
| **D30 retention** | Any session at day 30 | ≥ 25 % |
| **Dial-in efficacy** | Suggested change followed → score improves | ≥ 60 % of loops |
| **Convergence** | Brews to reach a user's "good" score on a new bag | ≤ 4 (median) |
| **Knowledge engagement** | Sessions containing ≥1 Learn card view | ≥ 40 % |
| **Contextual knowledge** | Learn views reached from a brew or bean context, not search | ≥ 60 % |
| **Offline reliability** | Brews completed with no network errors | ≥ 99.5 % |
| **Data trust** | Reported factual errors per 100 knowledge cards | < 1 |

---

## 15. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **The knowledge base is a bottomless pit** | Launch slips indefinitely | Fixed launch scope: species, ~90 varieties, all processes, ~30 origin countries, extraction, water, roast, methods. Everything else ships as post-launch content patches. |
| **Factual errors destroy the core promise** | Fatal to positioning | Schema-enforced citations, expert review pre-launch, in-app "report an error" on every card, public changelog |
| **iOS has no Web Bluetooth** | Scale features unavailable to a large share of mobile users | Manual mode is the designed default, not the fallback; Bluetooth is framed as a bonus everywhere in the UI. Structurally resolved at P2 by the Capacitor shell's native BLE transport (§18) |
| **Browser storage eviction on iOS** | Silent loss of a user's entire journal | Request persistent storage; periodic export reminders; the Capacitor shell moves the journal off browser-evictable storage (§18) |
| **PWA install friction on iOS** | Weak discovery; "Add to Home Screen" is invisible to most users | The web build is the SEO and trial surface, not the retention surface; App Store and Play listings arrive with the P2 shell (§18) |
| **Grind translation is inherently imprecise** | Bad advice erodes trust | Never present a single number; lead with personal-baseline deltas; state uncertainty visibly |
| **Over-scoped v1** | Nothing ships | Surfaces S1 / S3 / S5 / S9 plus F4 and F9 are the true MVP; everything else is explicitly deferrable |
| **Content licensing (flavour wheel, lexicon, standards)** | Legal exposure | Clear rights before bundling; fall back to an own-authored equivalent taxonomy |
| **We become a timer with a wiki** | No differentiation | The binding rule: no knowledge card without a `practicalImplication`; no recommendation without a mechanism link |
| **Espresso users demand espresso** | Feature pressure, scope creep | Say no clearly in-product; the data model is ready and the roadmap is public |

---

## 16. Roadmap

| Phase | Contents | Exit criterion |
|---|---|---|
| **P0 — Brew** (MVP) | F1 brew engine · F2 built-in recipes (V60, AeroPress, French press, Switch, Chemex) · F3 journal · F5 shelf · F9 calculators · minimal Learn (extraction, methods, processing) · offline PWA | A stranger brews, logs, and learns something — offline, with no account |
| **P1 — Dial in** | F4 dial-in assistant · F6 grinder registry and translation · F2 recipe builder · journal analysis and control chart · Learn: varieties, origins, roast | Median convergence ≤ 4 brews |
| **P2 — Measure** | F7 water lab · F10 smart scales · refractometer workflow · scale traces · TDS/EY throughout · **Capacitor shell + App Store / Play listings (§18)** | Rina imports her spreadsheet and stays; an iPhone user connects a scale |
| **P3 — Evaluate** | F8 cupping (CVA + legacy) · flavour wheel · blind sessions · team spaces · F12 sharing · accounts and sync | A café runs a real cupping in the app |
| **P4 — Expand** | Espresso module · remaining knowledge coverage · Bahasa Indonesia localisation · assistive language features | — |

---

## 17. Open questions

1. **Flavour wheel / sensory lexicon licensing** — bundle under licence, or author an equivalent? Blocks F8 design. *Owner: product. Needed by: start of P3.*
2. **Grinder µm data provenance** — is community-measured data credible enough to ship with an uncertainty band, or do we ship personal-baseline deltas only? *Owner: engineering + content. Needed by: P1.*
3. **CVA vs legacy as the default cupping form** — which does a home user see first?
4. **Does an account ever become mandatory?** Current answer: no. Confirm before building sync.
5. **Roaster partnerships** — is a machine-readable lot format worth pursuing, and who would adopt it?
6. **Monetisation** — one-time purchase, subscription for sync, or free with a paid pro tier? Must be decided before P2, and must never compromise the local-first or export guarantees.

---

## 18. Platform strategy

**Decision: ship a PWA at P0/P1, then wrap the same build in Capacitor from P2. Never maintain a second codebase.**

### 18.1 Why not native-first

A native-first build (Swift/Kotlin, React Native, or Flutter) buys exactly one capability the web cannot currently provide — Bluetooth on iOS — and that capability belongs to F10, a **P2** feature. Paying for it at P0 costs:

- **The acquisition channel.** §F9 names the calculators and §S9 names the knowledge base as the SEO front door. Native apps are not indexed. Building native-first deletes the only stated organic growth mechanism before it has been tried.
- **A second codebase**, before F4's convergence claim (§14, ≤4 brews median) has been validated at all.
- **Release latency.** App Store review between every content patch, in a product whose §11 content pipeline assumes frequent knowledge corrections.
- **§5.6**, which states offline is the default assumption — a requirement a well-built PWA already satisfies.

### 18.2 What the browser actually supports today

| Requirement | Browser status | Verdict |
|---|---|---|
| Offline app shell + bundled knowledge base | Service worker, universal | Ships |
| Screen wake lock during a brew (§F1 R4) | Screen Wake Lock API; Safari 16.4+ | Ships |
| Audio cues (§F1 R3) | Universal | Ships |
| Haptics (§F1 R3) | Vibration API absent in iOS Safari | Degrade; audio + visual carry the cue |
| Timer accuracy across suspension (§F1 R6) | Solved by timestamp-derived elapsed time, not by the platform | Ships, given the §12 requirement |
| Camera for label capture (§F5 R1) | `getUserMedia`, universal | Ships; OCR runs in WASM, slower than native, immaterial |
| Journal in IndexedDB (§F3) | Works; Safari evicts script-writable storage after ~7 idle days for non-installed sites | Ships **with** the §12 persistence requirement; structurally fixed at P2 |
| Web Push | iOS 16.4+, installed PWAs only | Not on any critical path |
| **Bluetooth scales (§F10)** | **Web Bluetooth: Chrome/Edge on desktop and Android. Absent from Safari on every platform, and every iOS browser is WebKit** | **Blocked on iOS. The sole reason the shell exists** |
| Store discovery | No PWA listing on iOS beyond Add to Home Screen | Resolved at P2 |

Third-party WebBLE browsers exist on iOS. Telling a user to install a different browser to weigh their coffee is not a product, and the PRD does not treat it as one.

### 18.3 The P2 shell

Capacitor wraps the **same web build** — no port, no parallel UI, no divergent feature set.

| What it adds | Mechanism |
|---|---|
| Bluetooth on iOS | Native BLE plugin registered as another **transport** behind the §F10 R1 interface |
| Durable journal storage | Native filesystem / SQLite, outside browser eviction policy |
| Store presence and discovery | App Store + Play listings |
| Real haptics | Native haptics plugin behind the same cue interface |
| Background-safe timing | Native foreground service where the platform permits |

The web build stays live and public throughout — it remains the SEO surface, the zero-install trial, and the desktop client.

**The whole migration is one interface widening.** §F10 R1 already isolates a protocol adapter per scale; it now also isolates the transport. When the shell arrives, the native BLE plugin registers as one more transport implementation and no brew-engine code changes. Anything platform-specific that leaks outside those two interfaces is a bug, caught in review.

### 18.4 Constraints this decision imposes on P0/P1

Cheap now, expensive later:

1. **No web-only APIs on a critical path** without a named native equivalent.
2. **All storage access behind one repository interface** — swapping IndexedDB for SQLite must not touch feature code.
3. **All device access (scale, camera, haptics, wake lock) behind capability interfaces** that report availability, so every surface already renders an unavailable-capability state before the shell exists.
4. **Elapsed time from timestamps only** (§12). Non-negotiable; a tick-accumulating timer must be rewritten under the shell anyway.
5. **Routing and assets must work from a `file://`-style origin**, not only from a server path — a late discovery here is the classic Capacitor rework.

### 18.5 What would overturn this

Revisit only on evidence, not preference:

- Bluetooth scale usage turns out to be the primary retention driver, not a P2 nice-to-have — pull the shell forward to P1, still Capacitor, still one codebase.
- Web Bluetooth ships in WebKit — the shell's main justification evaporates and it becomes purely a distribution decision.
- The espresso module (P4) demands sub-100 ms sensor loops the web layer cannot hold — a genuinely native argument, and the first one.

`ponytail: one codebase, wrapped later. A second native codebase is a rewrite disguised as a platform decision — say no until 18.5 fires.`

---

## Appendix A — Brew method parameter reference

| Method | Ratio | Grind | Temp | Total time | Mechanism |
|---|---|---|---|---|---|
| V60 | 1:15 – 1:17 | Medium-fine | 92–96 °C | 2:30 – 3:30 | Percolation |
| Kalita Wave | 1:15 – 1:16 | Medium | 92–94 °C | 3:00 – 3:45 | Percolation, flat bed |
| Chemex | 1:15 – 1:17 | Medium-coarse | 93–96 °C | 4:00 – 5:30 | Percolation, thick filter |
| Origami (cone) | 1:15 – 1:16 | Medium-fine | 92–95 °C | 2:30 – 3:15 | Percolation |
| Orea V4 | 1:15 – 1:16 | Medium-fine | 93–96 °C | 2:00 – 3:00 | Percolation, high flow |
| AeroPress (standard) | 1:12 – 1:16 | Medium-fine | 80–95 °C | 1:00 – 2:30 | Immersion + pressure |
| AeroPress (bypass) | 1:6 – 1:9, then dilute | Fine–medium | 85–95 °C | 1:00 – 2:00 | Immersion + dilution |
| French press | 1:15 – 1:17 | Coarse | 93–96 °C | 4:00 – 9:00 | Immersion |
| Clever / Switch | 1:15 – 1:17 | Medium | 92–96 °C | 2:30 – 4:00 | Hybrid |
| Siphon | 1:14 – 1:16 | Medium | ~92 °C at brew | 1:30 – 2:30 | Immersion + vacuum |
| Moka pot | 1:7 – 1:10 | Fine (not espresso-fine) | Pre-boiled fill | 3:00 – 5:00 | Steam pressure |
| Turkish | 1:10 – 1:12 | Powder-fine | Slow heat, no boil-over | 3:00 – 5:00 | Decoction |
| Cold brew (immersion) | 1:8 concentrate – 1:15 ready-to-drink | Coarse | Ambient / fridge | 12–20 h | Immersion |
| Kyoto slow drip | 1:8 – 1:10 | Medium-fine | Cold | 3–8 h | Slow percolation |
| Japanese iced | 1:15 total (≈60 % water, 40 % ice) | Medium-fine | 93–96 °C | 2:30 – 3:30 | Percolation + flash chill |
| Phin | 1:7 – 1:10 | Medium-coarse | 92–96 °C | 4:00 – 6:00 | Gravity percolation |

*All ranges are documented starting points with sources, not prescriptions.*

---

## Appendix B — Troubleshooting matrix (ships as data)

| Symptom | Most likely cause | First action | Alternatives |
|---|---|---|---|
| Sour, thin, short brew time | Grind too coarse | Grind finer | Raise temperature; extend contact |
| Sour, long brew time | Channelling / uneven bed | Fix pour and level the bed | Reduce agitation; check grinder |
| Bitter, dry, long drawdown | Over-extraction plus fines clogging | Grind coarser | Reduce agitation; lower temperature |
| Bitter but weak | Over-extracted *and* under-dosed | Tighten ratio and coarsen grind | Check for stale beans |
| Thin but not sour | Ratio too loose | More coffee per litre | Reduce bypass |
| Muddy, heavy, unclear | Excess fines / too much agitation | Coarser grind, gentler pours | Rinse filter; check burr wear |
| Flat, dull, muted | Water alkalinity too high | Lower KH or blend with distilled | Check bean age |
| Astringent, mouth-drying | Over-extraction at the tail | Shorten contact; coarsen | Stop the drawdown earlier |
| Great hot, harsh cold | Slight over-extraction | Reduce yield modestly | Lower temperature 2 °C |
| Inconsistent cup to cup | Technique or grinder variance | Standardise pour; single-dose | Check scale and kettle flow |
| Drawdown stalls | Fines migration / bed compaction | Coarser grind, fewer pours | Different filter; check paper |
| No bloom, no CO₂ | Coffee is stale | New bag | Verify roast date |
| Aggressive bloom, wild swelling | Coffee too fresh | Rest 3–7 more days | Longer bloom, cooler water |

---

## Appendix C — Fermentation & processing quick reference

| Technique | Typical duration | Vessel | Cup signature | Risk |
|---|---|---|---|---|
| Washed tank ferment | 12–36 h | Open tank | Clean, bright, varietal-true | Over-fermentation → vinegar |
| Kenyan double wash + soak | Ferment, then a clean-water soak | Tank + soak | Intense acidity, blackcurrant | Water use; timing |
| Natural, raised bed | 14–21 d drying | Beds | Jammy, sweet, heavy | Mould, uneven drying |
| Honey (red / black) | 6–20 d drying | Beds / patio | Syrupy, sweet, medium acidity | Sticking, over-fermentation |
| Anaerobic (sealed) | 24–120 h | Sealed, valved tank | Intense, boozy, unusual | Off-flavours; batch failure |
| Carbonic maceration | 48–120 h | CO₂-flushed vessel | Wine-like, cinnamon, tropical | Consistency |
| Lactic | 36–96 h | Low-oxygen, LAB-favouring | Creamy, yoghurt, soft acidity | pH control critical |
| Thermal shock | Cycles, hours | Tanks + temperature control | Amplified aromatics | Complex, costly |
| Yeast-inoculated | 24–72 h | Tank + selected strain | Directed, reproducible fruit | Strain / terroir mismatch |
| Koji | 24–72 h | Inoculated cherry or parchment | Umami, savoury-sweet | Food-safety handling |
| Wet-hulled (giling basah) | Hulled at 30–35 % moisture | — | Earthy, herbal, full body, low acid | Mould, defect load |

---

## Appendix D — Water reference

**SCA target brewing water:** TDS ≈ 150 mg/L (acceptable 75–250) · calcium hardness target ≈ 68 ppm as CaCO₃ (acceptable 17–85) · alkalinity ≈ 40 ppm as CaCO₃ · pH 6.5–7.5 · sodium ≈ 10 mg/L · odour-free · chlorine 0 mg/L.

| Profile | GH (ppm CaCO₃) | KH (ppm CaCO₃) | Character |
|---|---|---|---|
| SCA target | ~68 | ~40 | Balanced reference |
| Higher-extraction "bright" build | 70–110 | 10–40 | More extraction, acidity forward |
| Low-alkalinity light-roast build | 50–90 | 0–25 | Maximum acidity expression; unbuffered |
| Balanced everyday | 60–80 | 30–50 | Forgiving across roast levels |
| Dark-roast friendly | 50–70 | 50–70 | Buffers harshness, rounds bitterness |
| Distilled / RO only | ~0 | ~0 | Flat, poor extraction — **not recommended alone** |
| Hard tap (many cities) | 150–300+ | 100–250+ | Muted, chalky; scale damage |

Salts supported by the builder: MgSO₄·7H₂O (Epsom) · CaCl₂·2H₂O · CaSO₄·2H₂O (gypsum) · NaHCO₃ · KHCO₃. The builder always displays the resulting profile and warns outside the SCA acceptable range.

---

## Appendix E — Roast level ↔ brewing cheat sheet

| Descriptor | Agtron (ground, approx.) | Crack reference | Rest before filter | Grind vs baseline | Temp | Notes |
|---|---|---|---|---|---|---|
| Very light / Nordic | 95–85 | Just past first crack | 10–21 d | Finer | 94–96 °C | Dense, low solubility, needs energy |
| Light | 85–75 | Past first crack, short development | 7–18 d | Slightly finer | 93–96 °C | Classic specialty filter |
| Medium-light | 75–65 | Well past first crack | 5–14 d | Baseline | 92–95 °C | Most forgiving band |
| Medium | 65–55 | Approaching second crack | 4–12 d | Baseline | 91–94 °C | Balanced |
| Medium-dark | 55–45 | Into second crack | 3–10 d | Coarser | 88–92 °C | Body over clarity |
| Dark | 45–35 | Through second crack | 2–7 d | Coarser | 85–90 °C | Brittle, very soluble, easy to over-extract |

---

## Appendix F — Glossary (launch scope)

Agtron · alkalinity (KH) · anaerobic · astringency · bloom · body · bypass · carbonic maceration · channelling · chlorogenic acid · CO₂ degassing · cupping · defect (Category 1 / 2) · density · development time ratio · drawdown · extraction yield · fines · first crack · flat burr · fully washed · general hardness (GH) · giling basah · Golden Cup · honey process · Híbrido de Timor · immersion · introgression · landrace · LRR · Maillard reaction · melanoidin · micron · mucilage · natural process · parchment · peaberry · percolation · pulped natural · quaker · Q Grader · RDT · refractometer · retention · rate of rise · screen size · SHB/SHG · slurry · TDS · terroir · trigonelline · turbulence · varietal vs variety · WDT · wet mill

---

*End of document. Every claim in the knowledge sections above is a specification for content that must ship with a citation attached: the PRD asserts the structure, the content pipeline asserts the facts.*
