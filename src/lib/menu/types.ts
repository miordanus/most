export type Category = {
  id: string
  name: string
  sort_order: number
}

export type DishRow = {
  id: string
  category: string
  name: string
  short: string | null
  description: string | null
  price: number | null
  weight_g: number | null
  kcal_per_100g: number | null
  protein_per_100g: number | null
  fat_per_100g: number | null
  carbs_per_100g: number | null
  kcal_per_portion: number | null
  protein_per_portion: number | null
  fat_per_portion: number | null
  carbs_per_portion: number | null
  ingredients: string | null
  photo_url: string | null
  available: boolean
  featured: boolean
  sort_order: number
}

export type ExtraKind = 'addon' | 'mod' | 'option'

export type DishExtraRow = {
  id: string
  dish_id: string
  kind: ExtraKind
  name: string
  price: number
  sub: string | null
  is_default: boolean
  is_required: boolean
  group_label: string | null
  sort_order: number
}

export type Addon = { id: string; name: string; price: number }
export type Mod = { id: string; name: string; price: number }
export type Option = { id: string; name: string; sub: string | null; default: boolean }
export type OptionGroup = { label: string; required: boolean; options: Option[] }

export type Dish = {
  id: string
  category: string
  name: string
  short: string
  desc: string
  price: number | null
  weight: number | null
  kcal: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  ingredients: string
  photo: string | null
  featured: boolean
  addons: Addon[]
  mods: Mod[]
  options: OptionGroup | null
}

export type ShortlistItem = {
  uid: string
  dish: Dish
  addons: Addon[]
  mods: Mod[]
  option: Option | null
  lineTotal: number
  qty: number
}
