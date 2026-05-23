import { supabaseServer } from '@/lib/supabase/server'
import { hydrateDishes } from '@/lib/menu/group'
import { isDishComplete, parseMode } from '@/lib/menu/dq'
import type { Category, DishExtraRow, DishRow } from '@/lib/menu/types'
import { fixtureCategories, fixtureDishes } from '@/menu/fixture'
import { MenuApp } from './_components/MenuApp'

export const revalidate = 300

export const metadata = {
  robots: { index: false, follow: false },
}

type SearchParams = { [k: string]: string | string[] | undefined }

export default async function MenuPage({
  searchParams,
}: {
  searchParams?: SearchParams
}) {
  const mode = parseMode(searchParams?.mode)

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

  const allDishes = hydrateDishes(dishRows, extraRows)

  if (allDishes.length === 0) {
    return <MenuApp categories={fixtureCategories} dishes={fixtureDishes} mode={mode} />
  }

  // demo = only fully-populated dishes; empty categories drop out.
  const dishes = mode === 'demo' ? allDishes.filter(isDishComplete) : allDishes
  const usedCats = new Set(dishes.map((d) => d.category))
  const visibleCats = categories.filter((c) => usedCats.has(c.id))

  return <MenuApp categories={visibleCats} dishes={dishes} mode={mode} />
}
