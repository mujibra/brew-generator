/**
 * Brewer characteristics — PRD 8.9.
 *
 * These are the physical facts about a device that change what a recipe can be:
 * how fast it drains, how many pours its bed tolerates, and where its grind
 * range sits. Everything the generator does about geometry comes from here.
 */

export type BrewerId =
  | 'v60'
  | 'kalita'
  | 'chemex'
  | 'origami'
  | 'switch'
  | 'aeropress'
  | 'frenchPress'

export type Brewer = {
  id: BrewerId
  name: string
  geometry: 'cone' | 'flatBottom' | 'immersion'
  /** Percolation, immersion, or immersion that drains at the end. */
  mode: 'percolation' | 'immersion' | 'hybrid'
  /** Median grind in microns this brewer wants at a medium roast. */
  baseMicrons: number
  /** Comfortable pours after the bloom. More than this and the bed suffers. */
  maxPours: number
  /** Grams per second a steady pour puts in without flooding the bed. */
  pourRateGPerS: number
  /** Seconds the bed needs to draw down after the last pour, at base grind. */
  baseDrawdownS: number
  /** Sensible dose range for a single brew. */
  doseRangeG: { min: number; max: number }
  /** What this device is naturally good at, before any recipe decisions. */
  character: string
  /** Brewer-specific quirk the generator must respect. */
  constraint?: string
}

export const BREWERS: Record<BrewerId, Brewer> = {
  v60: {
    id: 'v60',
    name: 'Hario V60',
    geometry: 'cone',
    mode: 'percolation',
    baseMicrons: 700,
    maxPours: 5,
    pourRateGPerS: 7,
    baseDrawdownS: 45,
    doseRangeG: { min: 10, max: 40 },
    character: 'Fast, unrestricted flow. The most controllable and the least forgiving.',
  },
  kalita: {
    id: 'kalita',
    name: 'Kalita Wave',
    geometry: 'flatBottom',
    mode: 'percolation',
    baseMicrons: 760,
    maxPours: 4,
    pourRateGPerS: 5.5,
    baseDrawdownS: 60,
    doseRangeG: { min: 12, max: 35 },
    character: 'Flat bed and three small holes: the brewer restricts flow, not your pour.',
    constraint: 'The flat bed evens itself out, so extra pours buy less here than in a cone.',
  },
  chemex: {
    id: 'chemex',
    name: 'Chemex',
    geometry: 'cone',
    mode: 'percolation',
    baseMicrons: 850,
    maxPours: 3,
    pourRateGPerS: 5,
    baseDrawdownS: 90,
    doseRangeG: { min: 20, max: 60 },
    character: 'A very thick filter. Exceptional clarity, slow drawdown, no lipids at all.',
    constraint: 'The thick paper already slows things down, so grind coarser than a V60.',
  },
  origami: {
    id: 'origami',
    name: 'Origami',
    geometry: 'cone',
    mode: 'percolation',
    baseMicrons: 710,
    maxPours: 5,
    pourRateGPerS: 6.5,
    baseDrawdownS: 50,
    doseRangeG: { min: 10, max: 40 },
    character: 'Ribbed ceramic cone. Behaves like a V60 with a cone filter, flatter with a wave.',
  },
  switch: {
    id: 'switch',
    name: 'Hario Switch',
    geometry: 'cone',
    mode: 'hybrid',
    baseMicrons: 760,
    maxPours: 2,
    pourRateGPerS: 6,
    baseDrawdownS: 55,
    doseRangeG: { min: 12, max: 30 },
    character: 'Immersion with a valve. Even extraction first, then a percolation finish.',
    constraint: 'Closed, it is immersion — pour count barely matters. The steep does the work.',
  },
  aeropress: {
    id: 'aeropress',
    name: 'AeroPress',
    geometry: 'immersion',
    mode: 'immersion',
    baseMicrons: 600,
    maxPours: 1,
    pourRateGPerS: 8,
    baseDrawdownS: 30,
    doseRangeG: { min: 10, max: 20 },
    character: 'Full immersion plus gentle pressure. The most forgiving brewer there is.',
    constraint: 'One pour. Steep time and grind carry the whole recipe.',
  },
  frenchPress: {
    id: 'frenchPress',
    name: 'French press',
    geometry: 'immersion',
    mode: 'immersion',
    baseMicrons: 1000,
    maxPours: 1,
    pourRateGPerS: 8,
    baseDrawdownS: 0,
    doseRangeG: { min: 15, max: 60 },
    character: 'Full immersion, metal filter. Maximum body, minimum clarity.',
    constraint: 'No paper, so fines end up in the cup. Grind coarse and let them settle.',
  },
}

export const BREWER_LIST = Object.values(BREWERS)
