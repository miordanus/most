/* eslint-disable no-console */
/*
 * One-shot ingest: stamps nutrition + ingredients onto menu.dishes from an
 * XLSX with columns: Наименование блюда, Состав, Вес, Ккал на 100г, Белки, Жиры, Углеводы.
 *
 *   tsx scripts/import_nutrition.ts <path-to-xlsx>
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (service-role; never ship to client).
 *
 * Matched rows get nutrition_source='xlsx' + ingredients_source='xlsx'.
 * Unmatched rows go to menu.nutrition_unmatched for later reconciliation.
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

type Row = {
  name: string
  ingredients: string
  weightLabel: string
  weightG: number | null
  kcal: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
}

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseWeight(v: unknown): { g: number | null; label: string } {
  if (v == null) return { g: null, label: '' }
  const s = String(v).trim()
  const m = s.match(/\d+/)
  return { g: m ? Number(m[0]) : null, label: s }
}

function parseInt0(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}

async function main() {
  const xlsxPath = process.argv[2]
  if (!xlsxPath) {
    console.error('usage: tsx scripts/import_nutrition.ts <path-to-xlsx>')
    process.exit(2)
  }
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')

  const supa = createClient(url, key, { db: { schema: 'menu' } })

  const wb = XLSX.read(readFileSync(xlsxPath))
  const ws = wb.Sheets[wb.SheetNames[0]]
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false })
  // Header row is row 1 (index 1 in this sheet — index 0 is empty).
  const headerIdx = aoa.findIndex((r) => r[0] === 'Наименование блюда')
  if (headerIdx < 0) throw new Error('header row not found')

  const rows: Row[] = []
  for (let i = headerIdx + 1; i < aoa.length; i++) {
    const r = aoa[i]
    const name = String(r[0] ?? '').trim()
    if (!name) continue
    const { g, label } = parseWeight(r[2])
    rows.push({
      name,
      ingredients: String(r[1] ?? '').trim(),
      weightLabel: label,
      weightG: g,
      kcal: parseInt0(r[3]),
      protein: parseInt0(r[4]),
      fat: parseInt0(r[5]),
      carbs: parseInt0(r[6]),
    })
  }

  const { data: dishes, error: e1 } = await supa.from('dishes').select('id, name')
  if (e1) throw e1

  const byNorm = new Map<string, { id: string; name: string }>()
  for (const d of dishes ?? []) byNorm.set(norm(d.name), d)

  let matched = 0
  let unmatched = 0
  for (const r of rows) {
    const hit = byNorm.get(norm(r.name))
    if (!hit) {
      await supa.from('nutrition_unmatched').insert({ raw_name: r.name, payload: r as object })
      unmatched++
      continue
    }
    const { error } = await supa
      .from('dishes')
      .update({
        ingredients: r.ingredients,
        weight_g: r.weightG,
        weight_label: r.weightLabel,
        kcal: r.kcal,
        protein: r.protein,
        fat: r.fat,
        carbs: r.carbs,
        ingredients_source: 'xlsx',
        nutrition_source: 'xlsx',
      })
      .eq('id', hit.id)
    if (error) throw error
    matched++
  }

  await supa.from('import_runs').insert({
    source: 'xlsx_nutrition',
    rows_in: rows.length,
    rows_matched: matched,
    rows_inserted: 0,
    notes: `unmatched=${unmatched}; file=${xlsxPath}`,
  })

  console.log(`done: ${matched} matched, ${unmatched} unmatched of ${rows.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
