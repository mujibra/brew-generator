/**
 * Journal export — PRD F3 R9 and F13 R4.
 *
 * Always available, no account required. The CSV is the one people paste into a
 * spreadsheet, so column order is stable and every field is escaped properly.
 */

import type { BrewRecord } from '@/lib/db/repository'

const COLUMNS = [
  'id',
  'startedAt',
  'date',
  'recipeId',
  'brewerName',
  'goal',
  'iced',
  'doseG',
  'waterG',
  'ratio',
  'beverageG',
  'totalTimeS',
  'drawdownS',
  'waterTempC',
  'grindSetting',
  'tdsPct',
  'eyPct',
  'score',
  'tags',
  'notes',
] as const

/** RFC 4180: quote anything containing a comma, quote, newline, or leading space. */
function escapeCell(value: unknown): string {
  if (value === undefined || value === null) return ''
  const s = String(value)
  if (/[",\r\n]/.test(s) || s !== s.trim()) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(b: BrewRecord): (string | number | undefined)[] {
  return [
    b.id,
    b.startedAt,
    new Date(b.startedAt).toISOString(),
    b.recipeId,
    b.brewerName,
    b.goal,
    b.iced ? 'yes' : '',
    b.doseG,
    b.waterG,
    b.doseG > 0 ? Number((b.waterG / b.doseG).toFixed(2)) : undefined,
    b.beverageG,
    b.totalTimeS,
    b.drawdownS,
    b.waterTempC,
    b.grindSetting,
    b.tdsPct,
    b.eyPct !== undefined ? Number(b.eyPct.toFixed(2)) : undefined,
    b.score,
    (b.tags ?? []).join(' '),
    b.notes,
  ]
}

export function toCsv(brews: BrewRecord[]): string {
  const lines = [COLUMNS.join(',')]
  for (const b of brews) {
    lines.push(row(b).map(escapeCell).join(','))
  }
  // Trailing newline: some tools drop the last row without it.
  return `${lines.join('\r\n')}\r\n`
}

export function toJson(brews: BrewRecord[]): string {
  return JSON.stringify({ version: 1, exportedAt: Date.now(), brews }, null, 2)
}

export function exportFilename(kind: 'csv' | 'json', now: number): string {
  const d = new Date(now)
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `extraction-journal-${stamp}.${kind}`
}
