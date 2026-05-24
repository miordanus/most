# Per-portion nutrition (grams · ккал · Б/Ж/У бжу) on main menu

## Context

Today `menu.dishes` stores nutrition in `kcal`, `protein`, `fat`, `carbs` — but the source-of-truth (XLSX column "Ккал на 100г") and `scripts/import_nutrition.ts` populate these as **per-100g values**. The UI in `DishCard.tsx` and `DishDetailSheet.tsx` displays them as if per-portion. So real-data dishes currently show calorie/БЖУ numbers that are 100g-basis but labelled as portion totals — incorrect for everything where `weight_g ≠ 100`.

Goal: keep per-100g as the canonical input (don't lose data, import script stays aligned with XLSX), add a Supabase-side calc layer that derives per-portion values, and surface per-portion `вес · ккал · Б/Ж/У бжу` on every DishCard on the main menu. Detail sheet's БЖУ grid keeps working with no structural change — values just become correct.

## Approach

Single recommended approach. No alternatives kept here.

### 1. Schema migration — `supabase/migrations/0002_nutrition_per_100g_and_calc.sql`

```sql
alter table menu.dishes rename column kcal    to kcal_per_100g;
alter table menu.dishes rename column protein to protein_per_100g;
alter table menu.dishes rename column fat     to fat_per_100g;
alter table menu.dishes rename column carbs   to carbs_per_100g;

alter table menu.dishes
  add column kcal_per_portion    numeric generated always as (kcal_per_100g    * weight_g / 100.0) stored,
  add column protein_per_portion numeric generated always as (protein_per_100g * weight_g / 100.0) stored,
  add column fat_per_portion     numeric generated always as (fat_per_100g     * weight_g / 100.0) stored,
  add column carbs_per_portion   numeric generated always as (carbs_per_100g   * weight_g / 100.0) stored;
```

- Generated columns are `STORED` so they're indexable and queryable like any column.
- Null propagation is automatic: if either `*_per_100g` or `weight_g` is null, the per-portion value is null.
- Existing views in `0001_dq_columns_and_views.sql` (`menu.dq_dashboard`, `menu.dq_summary`) reference `kcal`/`protein`/etc. by name — update those views to use `kcal_per_100g` etc. (whichever basis the DQ check actually wants — keep per-100g since that's the input completeness).

### 2. Types & hydration — keep client API stable

`src/lib/menu/types.ts`:
- `DishRow` (lines 7–42): replace `kcal/protein/fat/carbs` with both `*_per_100g` and `*_per_portion` pairs.
- `Dish` (client model, lines 46–64): **keep the existing field names** `kcal`, `protein`, `fat`, `carbs` — but they now mean **per-portion**. This is the semantics consumers always assumed, so no DishCard/DishDetailSheet field renames are needed.

`src/lib/menu/group.ts` `hydrateDishes` (around lines 42–60): map `row.kcal_per_portion → dish.kcal`, same for protein/fat/carbs. Drop the old direct-passthrough.

Fallback path: `src/menu/fixture.ts` was authored with plausible per-portion БЖУ values. Convert each dish's nutrition to per-100g (`new_per_100g = old_per_portion × 100 / weight_g`) before storing in the fixture so the same hydration model works without branching. Compute once with a throwaway script or do it inline — dataset is small. Caveat: any fixture entry missing `weight_g` cannot be converted — either set a sensible default weight before converting or leave per-100g fields null (card will then hide the kcal/БЖУ segments).

### 3. UI — `DishCard.tsx` meta line

Replace the current line (lines 46–61) with compact per-portion line:

```
250 г · 540 ккал · 32/18/45 бжу
```

- Segments rendered conditionally: skip `weight` segment if null; skip `kcal` if null; render the Б/Ж/У segment **only when all three** of `protein/fat/carbs` are present and non-zero (the slash-format `32/18/45` doesn't read well with missing slots, and import is all-or-nothing per row).
- Format: `{fmtNum(protein)}/{fmtNum(fat)}/{fmtNum(carbs)} бжу` — single segment with the literal label `бжу` at the end (per user request).
- Update `hasMeta` (lines 8–9) to include the БЖУ check so the meta row still hides cleanly for nutrition-free dishes.
- Separator stays the existing middle-dot pattern.

`DishDetailSheet.tsx` (lines 123–131, 219–236): no structural change. `NutCell` will now receive correct per-portion values via the hydrated `Dish` fields.

### 4. Ingestion

`scripts/import_nutrition.ts` (lines 62–88): change the upsert payload keys from `kcal/protein/fat/carbs` to `kcal_per_100g/protein_per_100g/fat_per_100g/carbs_per_100g`. The XLSX values it already reads from "Ккал на 100г" and the БЖУ columns are per-100g, so this is just renaming destination keys. No math change.

If `scripts/menu/ingest_xlsx_report.py` or `scripts/menu/build_apply_sql.py` (currently untracked in `scripts/menu/`) also write nutrition columns, apply the same rename there.

### 5. Copy

`src/menu/copy.ts` (line 33): no change needed — the existing `nut` labels remain valid for the detail sheet. The card uses the literal `бжу` token directly in the formatter; if you want it via copy, add `nut.bzuLabel: 'бжу'`.

## Files to touch

- `supabase/migrations/0002_nutrition_per_100g_and_calc.sql` (new)
- Updates to per-100g column refs in `supabase/migrations/0001_dq_columns_and_views.sql`'s views — apply as a follow-up migration (`alter view` or `create or replace view`), don't edit the historical file.
- `src/lib/menu/types.ts` — DishRow fields
- `src/lib/menu/group.ts` — `hydrateDishes` mapping
- `src/menu/fixture.ts` — convert per-portion → per-100g
- `src/app/menu/_components/DishCard.tsx` — compact `вес · ккал · Б/Ж/У бжу` meta line
- `scripts/import_nutrition.ts` — destination column keys
- `scripts/menu/ingest_xlsx_report.py` and `scripts/menu/build_apply_sql.py` — if they write nutrition

## Verification

1. Apply migration locally; pick one real dish:
   ```sql
   select slug, weight_g, kcal_per_100g, kcal_per_portion,
          protein_per_100g, protein_per_portion
   from menu.dishes where slug = '<some-real-slug>' limit 1;
   ```
   Confirm `kcal_per_portion ≈ kcal_per_100g × weight_g / 100` and same for protein/fat/carbs.
2. Run the menu app, load `/menu`. On a card with full data, confirm the meta line reads e.g. `250 г · 540 ккал · 32/18/45 бжу` and the numbers match the math from step 1.
3. Open the detail sheet on the same dish — БЖУ grid values agree with the card.
4. Edge cases:
   - Dish with `weight_g = null` → no kcal/БЖУ segments, only any non-nutrition meta.
   - Dish with only `weight_g` populated → renders `XXX г` alone.
   - Dish with `kcal_per_100g` set but `weight_g = null` → calc-layer null, card shows only `XXX г` or nothing.
5. Re-run `scripts/import_nutrition.ts` against a known XLSX row; confirm it writes to `*_per_100g` and downstream the card shows correct per-portion math.
6. Once approved and out of plan mode, copy this spec to `docs/superpowers/specs/2026-05-24-per-portion-nutrition-design.md` and commit.
