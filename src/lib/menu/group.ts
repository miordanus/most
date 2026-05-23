import type { Dish, DishExtraRow, DishRow, OptionGroup } from './types'

export function hydrateDishes(
  rows: DishRow[],
  extras: DishExtraRow[],
): Dish[] {
  const byDish = new Map<string, DishExtraRow[]>()
  for (const e of extras) {
    const list = byDish.get(e.dish_id) ?? []
    list.push(e)
    byDish.set(e.dish_id, list)
  }

  return rows.map((r) => {
    const es = (byDish.get(r.id) ?? []).slice().sort(
      (a, b) => a.sort_order - b.sort_order,
    )

    const addons = es
      .filter((e) => e.kind === 'addon')
      .map((e) => ({ id: e.id, name: e.name, price: e.price }))

    const mods = es
      .filter((e) => e.kind === 'mod')
      .map((e) => ({ id: e.id, name: e.name, price: e.price }))

    const optionRows = es.filter((e) => e.kind === 'option')
    let options: OptionGroup | null = null
    if (optionRows.length > 0) {
      options = {
        label: optionRows[0].group_label ?? '',
        required: optionRows.some((o) => o.is_required),
        options: optionRows.map((o) => ({
          id: o.id,
          name: o.name,
          sub: o.sub,
          default: o.is_default,
        })),
      }
    }

    return {
      id: r.id,
      category: r.category,
      name: r.name,
      short: r.short ?? '',
      desc: r.description ?? '',
      price: r.price,
      weight: r.weight_g,
      weightLabel: r.weight_label ?? null,
      kcal: r.kcal,
      protein: r.protein,
      fat: r.fat,
      carbs: r.carbs,
      ingredients: r.ingredients ?? '',
      photo: r.photo_url,
      featured: r.featured,
      addons,
      mods,
      options,
    }
  })
}
