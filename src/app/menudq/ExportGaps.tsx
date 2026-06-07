'use client'

import { useState } from 'react'
import type { ChecklistRow, ExportRow } from './page'

type Props = {
  rows: ExportRow[]
  examples: ExportRow[]
  catNames: Record<string, string>
  filterLabel: string
}

// Fields we ask the kitchen/Masha to fill in, in display order.
const FIELDS: { key: keyof ChecklistRow; label: string }[] = [
  { key: 'name_state', label: 'name' },
  { key: 'short_state', label: 'short' },
  { key: 'description_state', label: 'desc' },
  { key: 'price_state', label: 'price' },
  { key: 'ingredients_state', label: 'ingr' },
  { key: 'nutrition_state', label: 'ккал/БЖУ' },
  { key: 'photo_state', label: 'фото' },
]

function gapsFor(r: ChecklistRow, want: 'missing' | 'mock') {
  return FIELDS.filter((f) => r[f.key] === want).map((f) => f.label)
}

function buildText(rows: ChecklistRow[], catNames: Record<string, string>) {
  const lines = rows.map((r) => {
    const cat = catNames[r.category] ?? r.category
    const missing = gapsFor(r, 'missing')
    const mock = gapsFor(r, 'mock')
    const parts: string[] = []
    if (missing.length) parts.push(`не хватает: ${missing.join(', ')}`)
    if (mock.length) parts.push(`моки: ${mock.join(', ')}`)
    const tail = parts.length ? ` — ${parts.join('; ')}` : ' — всё заполнено'
    return `«${r.name}» (${cat})${tail}`
  })
  return lines.join('\n')
}

function csvCell(v: string) {
  return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

// Normalize a stored nutrition value to per-100g. per_100g values are already correct;
// per_portion values are scaled by weight. Returns '' when unknown.
function per100(val: number | null, basis: ExportRow['kcal_basis'], weight: number | null) {
  if (val == null) return ''
  if (basis === 'per_100g') return String(val)
  if (basis === 'per_portion' && weight) return String(Math.round((val * 100) / weight))
  return String(val)
}

const CSV_HEADER = [
  'Тип',
  'Категория',
  'Блюдо',
  'Вес порции (г)',
  'Состав (3–6 слов)',
  'Описание (1–2 предложения)',
  'Ингредиенты (полный состав)',
  'Ккал на 100 г',
  'Белки на 100 г',
  'Жиры на 100 г',
  'Углеводы на 100 г',
]

// One CSV line. `fill=true` (examples) shows every real value; otherwise a field is shown
// only when its state is 'real' (missing/mock → blank for Masha to fill).
function csvRow(r: ExportRow, catNames: Record<string, string>, kind: 'ПРИМЕР' | 'к заполнению') {
  const fill = kind === 'ПРИМЕР'
  const show = (ok: boolean, v: string | number | null) => (fill || ok ? (v ?? '') : '')
  const nutri = (ok: boolean, v: number | null) =>
    fill || ok ? per100(v, r.kcal_basis, r.weight_g) : ''
  const weight = r.weight_g ?? (r.weight_label ? r.weight_label : '')
  return [
    kind,
    catNames[r.category] ?? r.category,
    r.name,
    weight,
    show(r.short_state === 'real', r.short),
    show(r.description_state === 'real', r.description),
    show(r.ingredients_state === 'real', r.ingredients),
    nutri(r.nutrition_state === 'real', r.kcal),
    nutri(r.nutrition_state === 'real', r.protein),
    nutri(r.nutrition_state === 'real', r.fat),
    nutri(r.nutrition_state === 'real', r.carbs),
  ]
    .map((c) => csvCell(String(c)))
    .join(',')
}

function buildCsv(examples: ExportRow[], rows: ExportRow[], catNames: Record<string, string>) {
  const lines = [
    CSV_HEADER.map(csvCell).join(','),
    ...examples.map((r) => csvRow(r, catNames, 'ПРИМЕР')),
    ...rows.map((r) => csvRow(r, catNames, 'к заполнению')),
  ]
  return lines.join('\r\n')
}

export default function ExportGaps({ rows, examples, catNames, filterLabel }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyText() {
    try {
      await navigator.clipboard.writeText(buildText(rows, catNames))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked (e.g. non-secure context) — no-op
    }
  }

  function downloadCsv() {
    const csv = '﻿' + buildCsv(examples, rows, catNames) // BOM so Excel reads Cyrillic
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `most-menu-template-${filterLabel}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="export-bar">
      <button type="button" onClick={copyText} className={copied ? 'copied' : ''}>
        {copied ? 'скопировано ✓' : 'Скопировать список'}
      </button>
      <button type="button" onClick={downloadCsv}>
        Скачать CSV
      </button>
      <span className="export-hint">экспорт по текущему фильтру: {rows.length} блюд</span>
    </div>
  )
}
