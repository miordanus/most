export type Category = {
  id: string
  name: string
  sort_order: number
}

export type DataSource =
  | 'menu_photo'
  | 'xlsx'
  | 'fixture'
  | 'manual'
  | 'unknown'

export type DishRow = {
  id: string
  category: string
  name: string
  short: string | null
  description: string | null
  price: number | null
  weight_g: number | null
  weight_label: string | null
  kcal: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  ingredients: string | null
  photo_url: string | null
  available: boolean
  featured: boolean
  sort_order: number
  // DQ tracking — see migration `dq_columns_and_views`
  name_source?: DataSource
  description_source?: DataSource
  ingredients_source?: DataSource
  price_source?: DataSource
  nutrition_source?: DataSource
  photo_source?: DataSource
  is_verified?: boolean
  created_at?: string
  updated_at?: string
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
  name_source?: DataSource
  price_source?: DataSource
  is_verified?: boolean
  created_at?: string
  updated_at?: string
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
  weightLabel: string | null
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
