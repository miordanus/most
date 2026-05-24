import { supabaseServer } from '@/lib/supabase/server'
import './menudq.css'

export const revalidate = 60
export const metadata = { robots: { index: false, follow: false } }

type State = 'real' | 'mock' | 'missing'

type ChecklistRow = {
  id: string
  category: string
  name: string
  available: boolean
  featured: boolean
  is_verified: boolean
  mock_status: string | null
  name_state: State
  short_state: State
  description_state: State
  price_state: State
  ingredients_state: State
  nutrition_state: State
  photo_state: State
  completeness: number
}

type SummaryRow = {
  category: string
  dishes: number
  available: number
  avg_completeness: string | number
  missing_short: number
  missing_desc: number
  missing_ingr: number
  missing_kcal: number
  missing_photo: number
  any_mock: number
}

type CategoryRow = { id: string; name: string; sort_order: number }

type FilterKey = 'all' | 'mock' | 'missing-photo' | 'missing-desc' | 'featured' | 'verified'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'все' },
  { key: 'mock', label: 'есть мок' },
  { key: 'missing-photo', label: 'нет фото' },
  { key: 'missing-desc', label: 'нет описания' },
  { key: 'featured', label: 'избранное' },
  { key: 'verified', label: 'verified' },
]

function chip(state: State) {
  const sym = state === 'real' ? '✓' : state === 'mock' ? '◐' : '·'
  return <span className={`chip ${state}`}>{sym}</span>
}

function completenessClass(n: number) {
  if (n >= 6) return 'full'
  if (n >= 4) return 'mid'
  return 'low'
}

function applyFilter(rows: ChecklistRow[], f: FilterKey): ChecklistRow[] {
  switch (f) {
    case 'mock':
      return rows.filter(
        (r) =>
          r.short_state === 'mock' ||
          r.description_state === 'mock' ||
          r.ingredients_state === 'mock' ||
          r.nutrition_state === 'mock' ||
          r.photo_state === 'mock' ||
          r.price_state === 'mock',
      )
    case 'missing-photo':
      return rows.filter((r) => r.photo_state === 'missing')
    case 'missing-desc':
      return rows.filter((r) => r.description_state === 'missing' || r.short_state === 'missing')
    case 'featured':
      return rows.filter((r) => r.featured)
    case 'verified':
      return rows.filter((r) => r.is_verified)
    case 'all':
    default:
      return rows
  }
}

export default async function MenuDqPage({
  searchParams,
}: {
  searchParams?: { filter?: string }
}) {
  const filter = (searchParams?.filter as FilterKey) || 'all'
  const validFilter: FilterKey = FILTERS.some((f) => f.key === filter) ? filter : 'all'

  const [catsRes, summaryRes, checklistRes] = await Promise.all([
    supabaseServer.from('categories').select('id,name,sort_order'),
    supabaseServer.from('dq_summary').select('*'),
    supabaseServer.from('dq_checklist').select('*'),
  ])

  if (catsRes.error) throw catsRes.error
  if (summaryRes.error) throw summaryRes.error
  if (checklistRes.error) throw checklistRes.error

  const cats = (catsRes.data ?? []) as CategoryRow[]
  const catName = new Map(cats.map((c) => [c.id, c.name]))
  const catOrder = new Map(cats.map((c) => [c.id, c.sort_order]))

  const summary = (summaryRes.data ?? []) as SummaryRow[]
  summary.sort((a, b) => (catOrder.get(a.category) ?? 999) - (catOrder.get(b.category) ?? 999))

  const checklistAll = (checklistRes.data ?? []) as ChecklistRow[]
  const filtered = applyFilter(checklistAll, validFilter)
  filtered.sort((a, b) => {
    const ca = catOrder.get(a.category) ?? 999
    const cb = catOrder.get(b.category) ?? 999
    if (ca !== cb) return ca - cb
    return a.name.localeCompare(b.name, 'ru')
  })

  const totals = summary.reduce(
    (acc, r) => {
      acc.dishes += r.dishes
      acc.available += r.available
      acc.missing_short += r.missing_short
      acc.missing_desc += r.missing_desc
      acc.missing_ingr += r.missing_ingr
      acc.missing_kcal += r.missing_kcal
      acc.missing_photo += r.missing_photo
      acc.any_mock += r.any_mock
      return acc
    },
    {
      dishes: 0,
      available: 0,
      missing_short: 0,
      missing_desc: 0,
      missing_ingr: 0,
      missing_kcal: 0,
      missing_photo: 0,
      any_mock: 0,
    },
  )

  return (
    <div className="menudq-root">
      <h1>МОСТ · Data Quality</h1>
      <p className="lede">
        Чек-лист состояния данных по блюдам. ✓ — реальные данные · ◐ — заглушка ·{' '}
        <span style={{ color: 'var(--text-dim)' }}>·</span> — пусто.{' '}
        <a href="/menu" style={{ color: 'var(--text-2)' }}>
          ← к меню
        </a>
      </p>

      <h2>По категориям ({summary.length})</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>категория</th>
              <th className="num">доступно</th>
              <th className="num">avg / 7</th>
              <th className="num">◐ мок</th>
              <th className="num">· нет short</th>
              <th className="num">· нет desc</th>
              <th className="num">· нет ingr</th>
              <th className="num">· нет ккал</th>
              <th className="num">· нет фото</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((r) => (
              <tr key={r.category}>
                <td>{catName.get(r.category) ?? r.category}</td>
                <td className="num">
                  {r.available}/{r.dishes}
                </td>
                <td className="num">
                  <span className={`completeness ${completenessClass(Number(r.avg_completeness))}`}>
                    {Number(r.avg_completeness).toFixed(1)}
                  </span>
                </td>
                <td className="num">{r.any_mock || ''}</td>
                <td className="num">{r.missing_short || ''}</td>
                <td className="num">{r.missing_desc || ''}</td>
                <td className="num">{r.missing_ingr || ''}</td>
                <td className="num">{r.missing_kcal || ''}</td>
                <td className="num">{r.missing_photo || ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Σ</td>
              <td className="num">
                {totals.available}/{totals.dishes}
              </td>
              <td className="num"></td>
              <td className="num">{totals.any_mock}</td>
              <td className="num">{totals.missing_short}</td>
              <td className="num">{totals.missing_desc}</td>
              <td className="num">{totals.missing_ingr}</td>
              <td className="num">{totals.missing_kcal}</td>
              <td className="num">{totals.missing_photo}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h2>
        Чек-лист блюд ({filtered.length}
        {validFilter !== 'all' ? ` из ${checklistAll.length}` : ''})
      </h2>
      <div className="filters">
        {FILTERS.map((f) => (
          <a
            key={f.key}
            href={f.key === 'all' ? '/menudq' : `/menudq?filter=${f.key}`}
            className={validFilter === f.key ? 'active' : ''}
          >
            {f.label}
          </a>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>блюдо</th>
              <th>name</th>
              <th>short</th>
              <th>desc</th>
              <th>price</th>
              <th>ingr</th>
              <th>kcal</th>
              <th>фото</th>
              <th className="num">% / 7</th>
              <th>mock_status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="dish-name">
                  <strong>{r.name}</strong>{' '}
                  <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                    {catName.get(r.category) ?? r.category}
                    {r.featured ? ' · ★' : ''}
                    {r.is_verified ? ' · verified' : ''}
                  </span>
                </td>
                <td>{chip(r.name_state)}</td>
                <td>{chip(r.short_state)}</td>
                <td>{chip(r.description_state)}</td>
                <td>{chip(r.price_state)}</td>
                <td>{chip(r.ingredients_state)}</td>
                <td>{chip(r.nutrition_state)}</td>
                <td>{chip(r.photo_state)}</td>
                <td className="num">
                  <span className={`completeness ${completenessClass(r.completeness)}`}>
                    {r.completeness}
                  </span>
                </td>
                <td className={r.mock_status ? `ms-${r.mock_status}` : ''}>
                  {r.mock_status ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
