import type { Dish } from './types'

/**
 * Price of one portion as it goes into the favorites list.
 * Per-100g dishes (steaks, ribs) use the typical portion weight (`weight_g`)
 * as an estimate; the waiter confirms the real weight. Without a weight we
 * can't estimate, so the dish adds 0 and the UI shows the per-100g price.
 */
export function portionPrice(d: Dish): number {
  if (!d.price) return 0
  if (!d.pricePer100g) return d.price
  if (!d.weight) return 0
  return Math.round((d.price * d.weight) / 100 / 10) * 10
}

/** True when the portion price is an estimate (per-100g dish with a typical weight). */
export const isEstimate = (d: Dish) => d.pricePer100g && !!d.price && !!d.weight

/** True when the per-100g dish has no typical weight, so it can't be summed. */
export const isUnpriced = (d: Dish) => d.pricePer100g && !!d.price && !d.weight
