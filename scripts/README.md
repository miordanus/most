# scripts

One-shot data tools. Not part of the Next.js build.

## `import_nutrition.ts`

Ingests an XLSX with columns `Наименование блюда / Состав / Вес / Ккал на 100г / Белки / Жиры / Углеводы` into `menu.dishes`. Matched rows get `ingredients_source='xlsx'` and `nutrition_source='xlsx'`; unmatched rows land in `menu.nutrition_unmatched` for later reconciliation. Every run is logged to `menu.import_runs`.

```bash
export SUPABASE_URL=https://<ref>.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...   # service role; never commit
npx tsx scripts/import_nutrition.ts ./path/to/nutrition.xlsx
```

Requires `xlsx` and `@supabase/supabase-js` (install when running):

```bash
npm i -D tsx xlsx @supabase/supabase-js
```

## TODO

- `sync_north_star.ts` — once we've parsed the printed-menu photo into `src/menu/north_star.json`, upsert it into `menu.dishes` with `name_source='menu_photo'`, `price_source='menu_photo'`, `is_verified=true`, and soft-delete absent rows.
- Burger modifications seed — waiting on a curated list from the user; will write into `menu.dish_extras` with `kind='mod'`.
