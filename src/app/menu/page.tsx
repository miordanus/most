import type { Category, Dish, DishExtraRow, DishRow } from '@/lib/menu/types'
import { hydrateDishes } from '@/lib/menu/group'
import { fixtureCategories, fixtureDishes } from '@/menu/fixture'
import { targetCategories, targetDishes, type TargetDish } from '@/menu/target'
import { MenuApp } from './_components/MenuApp'

export const revalidate = 300

export const metadata = {
  robots: { index: false, follow: false },
}

type SearchParams = { mode?: string | string[] }

export default async function MenuPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const modeParam = searchParams?.mode
  const mode = Array.isArray(modeParam) ? modeParam[0] : modeParam
  const isDemo = mode === 'prod' || mode === 'demo'

  if (isDemo) {
    return (
      <MenuApp
        categories={targetCategories}
        dishes={mergeTarget(targetDishes, [])}
      />
    )
  }

  const { supabaseServer } = await import('@/lib/supabase/server')

  const [catsRes, dishesRes, extrasRes] = await Promise.all([
    supabaseServer.from('categories').select('*').order('sort_order'),
    supabaseServer
      .from('dishes')
      .select('*')
      .eq('available', true)
      .order('sort_order'),
    supabaseServer.from('dish_extras').select('*').order('sort_order'),
  ])

  if (catsRes.error) throw catsRes.error
  if (dishesRes.error) throw dishesRes.error
  if (extrasRes.error) throw extrasRes.error

  const categories = (catsRes.data ?? []) as Category[]
  const dishRows = (dishesRes.data ?? []) as DishRow[]
  const extraRows = (extrasRes.data ?? []) as DishExtraRow[]

  const dishes = hydrateDishes(dishRows, extraRows)

  if (dishes.length === 0) {
    return <MenuApp categories={fixtureCategories} dishes={fixtureDishes} />
  }

  return <MenuApp categories={categories} dishes={dishes} />
}

function normName(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
}

function mergeTarget(target: TargetDish[], live: Dish[]): Dish[] {
  const byName = new Map<string, Dish>()
  for (const d of live) byName.set(normName(d.name), d)

  return target.map((t) => {
    const hit = byName.get(normName(t.name))
    if (hit) {
      return {
        ...hit,
        category: t.category,
        featured: hit.featured || t.featured,
      }
    }
    return {
      id: t.id,
      category: t.category,
      name: t.name,
      short: t.short,
      desc: '',
      price: t.price,
      weight: t.weight_g,
      weightLabel: t.weight_label,
      kcal: t.kcal,
      protein: t.protein,
      fat: t.fat,
      carbs: t.carbs,
      ingredients: t.ingredients,
      photo: null,
      featured: t.featured,
      addons: [],
      mods: [],
      options: null,
    }
  })
}
