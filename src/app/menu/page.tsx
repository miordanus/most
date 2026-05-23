import { hydrateDishes } from '@/lib/menu/group'
import type { Category, DishExtraRow, DishRow } from '@/lib/menu/types'
import { fixtureCategories, fixtureDishes } from '@/menu/fixture'
import { MenuApp } from './_components/MenuApp'

export const revalidate = 300

export const metadata = {
  robots: { index: false, follow: false },
}

export default async function MenuPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <MenuApp categories={fixtureCategories} dishes={fixtureDishes} />
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
