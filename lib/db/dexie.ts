/**
 * Dexie implementation of the storage seam.
 *
 * The ONLY file that imports Dexie. Swapped wholesale for SQLite in the
 * Capacitor shell (PRD 18.3). Schema versions live here so migrations are one
 * `.version(n).stores()` call rather than hand-written upgrade code.
 */

import Dexie, { type Table } from 'dexie'
import type {
  BeanRecord,
  BrewRecord,
  Collection,
  Entity,
  ExportBundle,
  GrinderRecord,
  Id,
  RecipeRecord,
  Repository,
  SettingsRecord,
  WaterProfileRecord,
} from './repository'

class ExtractionDb extends Dexie {
  beans!: Table<BeanRecord, string>
  recipes!: Table<RecipeRecord, string>
  brews!: Table<BrewRecord, string>
  grinders!: Table<GrinderRecord, string>
  waterProfiles!: Table<WaterProfileRecord, string>
  settings!: Table<SettingsRecord, string>

  constructor() {
    super('extraction')
    this.version(1).stores({
      // Indexes chosen for the screens that exist: shelf list, journal by bean,
      // journal by date. Add an index when a screen needs it, not before.
      beans: 'id, roaster, roastDate, archived, updatedAt',
      recipes: 'id, methodId, parentId, updatedAt',
      brews: 'id, startedAt, beanId, recipeId, grinderId, score, updatedAt',
      grinders: 'id, name, updatedAt',
      waterProfiles: 'id, name, updatedAt',
    })
    // v2 adds the singleton gear/settings row. Existing data is untouched.
    this.version(2).stores({
      settings: 'id, updatedAt',
    })
  }
}

function collection<T extends Entity>(table: Table<T, string>): Collection<T> {
  return {
    get: (id) => table.get(id),
    all: () => table.toArray(),
    put: async (item) => {
      await table.put({ ...item, updatedAt: Date.now() })
      return item.id
    },
    bulkPut: async (items) => {
      const now = Date.now()
      await table.bulkPut(items.map((i) => ({ ...i, updatedAt: now })))
    },
    delete: (id) => table.delete(id),
    count: () => table.count(),
    where: (field, equals) => table.where(field).equals(equals).toArray(),
  }
}

export function createDexieRepository(): Repository {
  const db = new ExtractionDb()

  const beans = collection(db.beans)
  const recipes = collection(db.recipes)
  const brews = collection(db.brews)
  const grinders = collection(db.grinders)
  const waterProfiles = collection(db.waterProfiles)
  const settings = collection(db.settings)

  return {
    beans,
    settings,
    recipes,
    brews,
    grinders,
    waterProfiles,

    async exportAll(): Promise<ExportBundle> {
      return {
        version: 1,
        exportedAt: Date.now(),
        beans: await beans.all(),
        recipes: await recipes.all(),
        brews: await brews.all(),
        grinders: await grinders.all(),
        waterProfiles: await waterProfiles.all(),
        settings: await settings.all(),
      }
    },

    async importAll(bundle: ExportBundle): Promise<void> {
      if (bundle.version !== 1) {
        throw new Error(`Unsupported export version ${bundle.version}`)
      }
      await db.transaction(
        'rw',
        [db.beans, db.recipes, db.brews, db.grinders, db.waterProfiles, db.settings],
        async () => {
          await beans.bulkPut(bundle.beans)
          await recipes.bulkPut(bundle.recipes)
          await brews.bulkPut(bundle.brews)
          await grinders.bulkPut(bundle.grinders)
          await waterProfiles.bulkPut(bundle.waterProfiles)
          if (bundle.settings) await settings.bulkPut(bundle.settings)
        },
      )
    },

    /**
     * PRD 12: without this, Safari may evict the journal after ~7 idle days for
     * a site the user has not installed. A false result is not fatal but it does
     * mean the export reminder matters.
     */
    async requestPersistence(): Promise<boolean> {
      if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
      try {
        if (await navigator.storage.persisted()) return true
        return await navigator.storage.persist()
      } catch {
        return false
      }
    },
  }
}

let instance: Repository | undefined

/** Lazy singleton — never constructed during a static export build. */
export function repository(): Repository {
  if (typeof indexedDB === 'undefined') {
    throw new Error('repository() called outside the browser')
  }
  instance ??= createDexieRepository()
  return instance
}
