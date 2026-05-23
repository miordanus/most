import type { Dish } from './types'

// Demo mode hides anything that isn't camera-ready: it needs a real price,
// a full nutrition row, an ingredients string, AND a photo. Prod (target
// menu) shows everything we eventually want to ship, placeholders and all.
export function isDishComplete(d: Dish): boolean {
  const hasPrice = d.price != null && d.price > 0
  const hasNutrition =
    d.kcal != null && d.protein != null && d.fat != null && d.carbs != null
  const hasIngredients = d.ingredients.trim().length > 0
  const hasPhoto = !!d.photo && d.photo.trim().length > 0
  return hasPrice && hasNutrition && hasIngredients && hasPhoto
}

export type MenuMode = 'prod' | 'demo'

export function parseMode(raw: string | string[] | undefined): MenuMode {
  const v = Array.isArray(raw) ? raw[0] : raw
  // Default is `demo` while we're filling in the target menu — we'd rather
  // show a thin polished view than a wall of placeholders. Prod is opt-in.
  return v === 'prod' ? 'prod' : 'demo'
}
