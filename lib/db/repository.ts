import type { RoastLevel } from '@/lib/calc/freshness'

/**
 * Storage seam — PRD 18.4 constraint 2.
 *
 * Feature code depends on THIS interface, never on Dexie or IndexedDB directly.
 * At Phase 2 the Capacitor shell swaps in a SQLite implementation and no feature
 * code changes. Any `import 'dexie'` outside lib/db is a bug.
 */

export type Id = string

export type Entity = { id: Id; updatedAt: number }

export interface Collection<T extends Entity> {
  get(id: Id): Promise<T | undefined>
  all(): Promise<T[]>
  put(item: T): Promise<Id>
  bulkPut(items: T[]): Promise<void>
  delete(id: Id): Promise<void>
  count(): Promise<number>
  /** Index-backed range query. Kept deliberately narrow — widen only when a screen needs it. */
  where(field: keyof T & string, equals: string | number): Promise<T[]>
}

export interface Repository {
  beans: Collection<BeanRecord>
  settings: Collection<SettingsRecord>
  recipes: Collection<RecipeRecord>
  brews: Collection<BrewRecord>
  grinders: Collection<GrinderRecord>
  waterProfiles: Collection<WaterProfileRecord>
  /** PRD F13 R4: export everything, always, no account required. */
  exportAll(): Promise<ExportBundle>
  importAll(bundle: ExportBundle): Promise<void>
  /** PRD 12: request durable storage. Resolves false when the browser refuses. */
  requestPersistence(): Promise<boolean>
}

export type ExportBundle = {
  version: 1
  exportedAt: number
  beans: BeanRecord[]
  recipes: RecipeRecord[]
  brews: BrewRecord[]
  grinders: GrinderRecord[]
  waterProfiles: WaterProfileRecord[]
  settings?: SettingsRecord[]
}

// --- Records. Deliberately flat and index-friendly; see PRD 10 for the full model.

export type BeanRecord = Entity & {
  name: string
  roaster: string
  /** ISO date. Roasted-on beats best-before, so this is the date that matters. */
  roastDate?: string
  roastLevel?: RoastLevel
  sizeG: number
  remainingG: number
  country?: string
  region?: string
  /** Growing altitude in metres. A density proxy the generator uses. */
  altitudeMasl?: number
  /** Free text until the knowledge base lands and these become entity links. */
  variety?: string
  process?: string
  varietyIds?: string[]
  processId?: string
  roasterNotes?: string
  notes?: string
  /** Kept for history rather than deleted, so the shelf doubles as a buy list. */
  archived?: boolean
  wouldBuyAgain?: boolean
}

export type RecipeRecord = Entity & {
  name: string
  methodId: string
  version: number
  parentId?: Id
  doseG: number
  ratio: number
  waterTempC: number
  bloomWaterG: number
  totalTimeS: number
  geometry: 'cone' | 'flatBottom' | 'immersion'
  steps: unknown[]
  sourceUrl?: string
}

export type BrewRecord = Entity & {
  startedAt: number
  recipeId?: Id
  beanId?: Id
  /** Days off roast at brew time, frozen in so it survives the bean being edited. */
  daysOffRoast?: number
  grinderId?: Id
  grindSetting?: string
  waterProfileId?: Id
  doseG: number
  waterG: number
  beverageG?: number
  totalTimeS: number
  drawdownS?: number
  waterTempC?: number
  tdsPct?: number
  eyPct?: number
  score?: number
  tags?: string[]
  notes?: string
  /** Mass over time from a connected scale. PRD F10 R5. */
  scaleTrace?: { t: number; g: number }[]
  dialInHypothesis?: string
  dialInOutcome?: 'better' | 'worse' | 'same'
}

export type GrinderRecord = Entity & {
  name: string
  unitLabel: string
  micronsPerUnit?: number
  baseline?: number
  burrType?: 'conical' | 'flat'
}

/**
 * Singleton settings row, id 'gear'. One record rather than a key-value table:
 * it is read as a unit on every screen that needs it, and it stays typed.
 */
export type SettingsRecord = Entity & {
  id: 'gear'
  grinderId?: string
  /** The user's own grind setting per brewer id. PRD F6 R3 — the reliable path. */
  baselines?: Record<string, number>
  typicalDoseG?: number
  /** A dial-in suggestion the user said they would try, awaiting a verdict. */
  pendingHypothesis?: {
    id: string
    action: string
    setAt: number
    /** The setting the brew was diagnosed at, so the change is traceable. */
    fromGrind?: string
    /** The setting to actually use. Without this the advice never reaches the grinder. */
    targetGrind?: string
    /** Where to brew it, so "Brew it" returns to the recipe being dialled in. */
    recipeId?: string
  }
}

export type WaterProfileRecord = Entity & {
  name: string
  ghPpmCaCO3: number
  khPpmCaCO3: number
  sodiumMgL?: number
  tdsMgL?: number
  readOnly?: boolean
}
