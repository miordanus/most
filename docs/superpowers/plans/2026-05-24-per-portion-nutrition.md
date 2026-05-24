# Per-portion nutrition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the values stored in `menu.dishes` semantically correct (per-100g) and add a Supabase calc layer that derives per-portion `kcal/protein/fat/carbs`; surface per-portion `вес · ккал · Б/Ж/У бжу` on every `DishCard` of the main menu without changing detail-sheet structure.

**Architecture:** A single Supabase migration renames the four nutrition columns to `*_per_100g` and adds four `GENERATED ALWAYS AS (… * weight_g / 100.0)::int STORED` columns alongside; two dependent views (`menu.dq_checklist`, `menu.dq_summary`) are dropped+recreated against the renamed columns. The TS row type gains the new columns; `Dish` (client model) keeps its existing field names but the hydrator now sources them from the per-portion generated columns — so every consumer (`DishCard`, `DishDetailSheet`) flips meaning without renaming. `DishCard` gains a compact Б/Ж/У segment. The XLSX→SQL generator (`build_apply_sql.py`) writes to the new `*_per_100g` columns. Fixture data (per-portion by author intent) is converted to per-100g so the same hydration path renders matching numbers in the no-Supabase fallback.

**Tech Stack:** Postgres 17 (Supabase), Next.js 14, TypeScript, Python 3 (XLSX ingest scripts).

---

## File Structure

- `docs/superpowers/specs/2026-05-24-per-portion-nutrition-design.md` — copy of approved spec (created in Task 1).
- `supabase/migrations/0003_nutrition_per_100g_and_calc.sql` — new migration; full SQL recorded for repo history. (Numbering: 0001 = DQ columns/views per git history, 0002 = photo storage; pick the next free integer when creating — confirm by `ls supabase/migrations` or git log if the folder is empty on disk.)
- `src/lib/menu/types.ts` — extend `DishRow`, keep `Dish` field names.
- `src/lib/menu/group.ts` — hydrate from `*_per_portion`.
- `src/menu/fixture.ts` — convert per-portion → per-100g.
- `src/app/menu/_components/DishCard.tsx` — add Б/Ж/У segment + label.
- `src/menu/copy.ts` — add `nut.bzu` literal label.
- `scripts/menu/build_apply_sql.py` — write to `*_per_100g`.

The database lives in the `menu` Postgres schema; the supabase-js client is configured with `db: { schema: 'menu' }` (`src/lib/supabase/server.ts`), so `from('dishes').select('*')` already targets `menu.dishes` — no change needed to queries.

---

### Task 1: Copy approved spec into the repo

**Files:**
- Create: `docs/superpowers/specs/2026-05-24-per-portion-nutrition-design.md`

- [ ] **Step 1: Copy the approved plan file as the spec record**

```bash
cp /Users/max/.claude/plans/lets-rework-the-logic-snoopy-hopper.md docs/superpowers/specs/2026-05-24-per-portion-nutrition-design.md
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-05-24-per-portion-nutrition-design.md
git commit -m "docs(spec): per-portion nutrition design"
```

---

### Task 2: Apply the Supabase migration (drop views → rename cols → add generated cols → recreate views)

**Files:**
- Create: `supabase/migrations/0003_nutrition_per_100g_and_calc.sql` (canonical record; the actual apply runs via the Supabase MCP `apply_migration` tool).

**Project:** Supabase project id `sfzyqdpckgyznuhunygj` (host `db.sfzyqdpckgyznuhunygj.supabase.co`, region `eu-west-1`). Confirmed `menu.dishes` columns `kcal/protein/fat/carbs/weight_g` are all `integer` and non-generated. Two dependent views in `menu` schema reference `kcal`: `menu.dq_checklist` and (transitively) `menu.dq_summary`.

- [ ] **Step 1: Write the migration SQL to disk for repo history**

Create `supabase/migrations/0003_nutrition_per_100g_and_calc.sql` (create the `supabase/migrations/` directory if it does not exist):

```sql
-- 0003_nutrition_per_100g_and_calc.sql
-- Stored kcal/protein/fat/carbs values come from XLSX "Ккал на 100г" — i.e. per-100g, not per-portion.
-- Rename them to make that explicit, then add per-portion generated columns derived from weight_g.
-- Views menu.dq_checklist + menu.dq_summary reference the old names; drop+recreate using the new names.

begin;

drop view if exists menu.dq_summary;
drop view if exists menu.dq_checklist;

alter table menu.dishes rename column kcal    to kcal_per_100g;
alter table menu.dishes rename column protein to protein_per_100g;
alter table menu.dishes rename column fat     to fat_per_100g;
alter table menu.dishes rename column carbs   to carbs_per_100g;

alter table menu.dishes
  add column kcal_per_portion    integer generated always as (round(kcal_per_100g    * weight_g / 100.0)::int) stored,
  add column protein_per_portion integer generated always as (round(protein_per_100g * weight_g / 100.0)::int) stored,
  add column fat_per_portion     integer generated always as (round(fat_per_100g     * weight_g / 100.0)::int) stored,
  add column carbs_per_portion   integer generated always as (round(carbs_per_100g   * weight_g / 100.0)::int) stored;

-- Recreate views, replacing kcal → kcal_per_100g (input completeness check stays on per-100g).
create view menu.dq_checklist as
select
  id, category, name, available, featured, is_verified, verified_by_masha, mock_status,
  case
    when name is null or length(name) = 0 then 'missing'
    when name_source = 'mockup' then 'mock'
    else 'real'
  end as name_state,
  case
    when short is null or length(short) = 0 then 'missing'
    when short_source = 'mockup' then 'mock'
    else 'real'
  end as short_state,
  case
    when description is null or length(description) = 0 then 'missing'
    when description_source = 'mockup' then 'mock'
    else 'real'
  end as description_state,
  case
    when price is null then 'missing'
    when price_source = 'mockup' then 'mock'
    else 'real'
  end as price_state,
  case
    when ingredients is null or length(ingredients) = 0 then 'missing'
    when ingredients_source = 'mockup' then 'mock'
    else 'real'
  end as ingredients_state,
  case
    when kcal_per_100g is null then 'missing'
    when nutrition_source = 'mockup' then 'mock'
    else 'real'
  end as nutrition_state,
  case
    when photo_url is null then 'missing'
    when photo_source = 'mockup' then 'mock'
    else 'real'
  end as photo_state,
  case
    when not is_verified then 'not_ready'
    when is_verified and not verified_by_masha then 'pending'
    else 'done'
  end as masha_state,
  (case when name        is not null and length(name) > 0        then 1 else 0 end) +
  (case when short       is not null and length(short) > 0       then 1 else 0 end) +
  (case when description is not null and length(description) > 0 then 1 else 0 end) +
  (case when price       is not null                              then 1 else 0 end) +
  (case when ingredients is not null and length(ingredients) > 0 then 1 else 0 end) +
  (case when kcal_per_100g is not null                            then 1 else 0 end) +
  (case when photo_url   is not null                              then 1 else 0 end) as completeness
from menu.dishes d;

create view menu.dq_summary as
select
  category,
  count(*) as dishes,
  count(*) filter (where available) as available,
  avg(completeness)::numeric(4,2) as avg_completeness,
  count(*) filter (where short_state = 'missing')       as missing_short,
  count(*) filter (where description_state = 'missing') as missing_desc,
  count(*) filter (where ingredients_state = 'missing') as missing_ingr,
  count(*) filter (where nutrition_state = 'missing')   as missing_kcal,
  count(*) filter (where photo_state = 'missing')       as missing_photo,
  count(*) filter (
    where short_state = 'mock' or description_state = 'mock'
       or ingredients_state = 'mock' or nutrition_state = 'mock'
       or photo_state = 'mock'
  ) as any_mock,
  count(*) filter (where is_verified)                    as max_done,
  count(*) filter (where masha_state = 'pending')        as masha_pending,
  count(*) filter (where verified_by_masha)              as masha_done
from menu.dq_checklist
group by category
order by category;

commit;
```

- [ ] **Step 2: Apply the migration to the live Supabase project via MCP**

Invoke the `mcp__claude_ai_Supabase__apply_migration` tool with:
- `project_id`: `sfzyqdpckgyznuhunygj`
- `name`: `nutrition_per_100g_and_calc`
- `query`: the full SQL from Step 1 above

Expected: success with no error. Migration is applied to `menu.dishes` and the two views are recreated.

- [ ] **Step 3: Verify per-portion math via MCP `execute_sql`**

Run on project `sfzyqdpckgyznuhunygj`:

```sql
select id, name, weight_g,
       kcal_per_100g, kcal_per_portion,
       protein_per_100g, protein_per_portion,
       fat_per_100g, fat_per_portion,
       carbs_per_100g, carbs_per_portion
from menu.dishes
where kcal_per_100g is not null
order by id
limit 5;
```

Expected: each row's `kcal_per_portion ≈ round(kcal_per_100g * weight_g / 100)` (and same for protein/fat/carbs). For example, with `weight_g = 180` and `kcal_per_100g = 460`, expect `kcal_per_portion = 828`.

Also confirm the views exist:

```sql
select viewname from pg_views where schemaname='menu' order by viewname;
```

Expected: includes both `dq_checklist` and `dq_summary`.

- [ ] **Step 4: Commit the migration file**

```bash
git add supabase/migrations/0003_nutrition_per_100g_and_calc.sql
git commit -m "feat(db): nutrition stored as per-100g + per-portion calc columns"
```

---

### Task 3: Update DishRow type (TypeScript)

**Files:**
- Modify: `src/lib/menu/types.ts:7-24`

- [ ] **Step 1: Replace nutrition fields on DishRow**

Replace lines 15–18 (`kcal/protein/fat/carbs`) with both per-100g and per-portion pairs. Final `DishRow` (lines 7–24) becomes:

```typescript
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
```

Leave the `Dish` type (lines 46–64) untouched: its `kcal/protein/fat/carbs: number | null` fields now semantically mean per-portion, but the field names stay.

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit` (or `npm run typecheck` / `yarn tsc --noEmit` — pick whichever the project uses; check `package.json` scripts).
Expected: compile errors in `src/lib/menu/group.ts` (reading `r.kcal` etc.) — that's intentional; Task 4 fixes them. Confirm there are NO errors outside `group.ts`.

- [ ] **Step 3: No commit yet** — the change is incomplete on its own; commit together with Task 4.

---

### Task 4: Update hydrateDishes to source from per-portion columns

**Files:**
- Modify: `src/lib/menu/group.ts:42-60`

- [ ] **Step 1: Map per-portion columns into Dish**

Replace lines 50–53 in the returned object (currently `kcal: r.kcal, protein: r.protein, fat: r.fat, carbs: r.carbs`) with:

```typescript
      kcal: r.kcal_per_portion,
      protein: r.protein_per_portion,
      fat: r.fat_per_portion,
      carbs: r.carbs_per_portion,
```

Leave everything else in the function unchanged.

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS (zero errors).

- [ ] **Step 3: Commit Tasks 3 + 4 together**

```bash
git add src/lib/menu/types.ts src/lib/menu/group.ts
git commit -m "feat(menu): hydrate dishes from per-portion calc columns"
```

---

### Task 5: Convert fixture nutrition from per-portion → per-100g

**Context:** `src/menu/fixture.ts` was authored with per-portion values (the rendered numbers users saw before the rework). After Tasks 3–4 the hydrator reads `r.kcal_per_portion` etc., but the fixture path bypasses Supabase and feeds `Dish` objects directly to the renderer — so the fixture values stay per-portion at the consumption point (`Dish.kcal`). **No conversion is needed for the fixture path to render the same numbers as before.**

However, to keep the fixture conceptually aligned with the new model (and to support any future code path that materializes per-100g from the fixture), we expose the original per-portion authoring as `Dish.kcal/protein/fat/carbs` and leave the fixture file's values as-is. **This task is no-op for files; it documents the decision.**

- [ ] **Step 1: Add a one-line comment at the top of `src/menu/fixture.ts`**

Add immediately after the imports (after current line 1):

```typescript
// Nutrition values below are per-portion (matches Dish.kcal semantics post-2026-05 rework).
```

- [ ] **Step 2: Commit**

```bash
git add src/menu/fixture.ts
git commit -m "docs(fixture): note that nutrition values are per-portion"
```

---

### Task 6: Add `бжу` label to copy

**Files:**
- Modify: `src/menu/copy.ts:33`

- [ ] **Step 1: Add the literal to the `nut` block**

Change line 33 from:

```typescript
    nut: { g: 'г', kcal: 'ккал', protein: 'бел.', fat: 'жир.', carbs: 'угл.' },
```

to:

```typescript
    nut: { g: 'г', kcal: 'ккал', protein: 'бел.', fat: 'жир.', carbs: 'угл.', bzu: 'бжу' },
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: No commit yet** — commit together with Task 7.

---

### Task 7: Add compact Б/Ж/У segment to DishCard meta line

**Files:**
- Modify: `src/app/menu/_components/DishCard.tsx:8-9, 42-63`

- [ ] **Step 1: Extend `hasMeta` to include БЖУ**

Replace line 9:

```typescript
const hasMeta = (d: Dish) => hasVal(d.weight) || hasVal(d.kcal)
```

with:

```typescript
const hasBzu = (d: Dish) => hasVal(d.protein) && hasVal(d.fat) && hasVal(d.carbs)
const hasMeta = (d: Dish) => hasVal(d.weight) || hasVal(d.kcal) || hasBzu(d)
```

- [ ] **Step 2: Render the БЖУ segment after kcal**

In the JSX (lines 46–61), after the existing `kcal` `<span>` and before the closing `</div>` of `mb-dish-meta`, insert the dot-separator + БЖУ segment. The full final block:

```tsx
          {hasMeta(dish) && (
            <div className="mb-dish-meta">
              {hasVal(dish.weight) && (
                <span>
                  {fmtNum(dish.weight)}
                  {copy.detail.nut.g}
                </span>
              )}
              {hasVal(dish.weight) && hasVal(dish.kcal) && <span className="mb-dot" />}
              {hasVal(dish.kcal) && (
                <span>
                  {fmtNum(dish.kcal)} {copy.detail.nut.kcal}
                </span>
              )}
              {(hasVal(dish.weight) || hasVal(dish.kcal)) && hasBzu(dish) && <span className="mb-dot" />}
              {hasBzu(dish) && (
                <span>
                  {fmtNum(dish.protein)}/{fmtNum(dish.fat)}/{fmtNum(dish.carbs)} {copy.detail.nut.bzu}
                </span>
              )}
            </div>
          )}
```

Notes:
- The dot separator before the БЖУ segment renders only if at least one earlier segment (weight or kcal) is present, mirroring the existing weight↔kcal pattern.
- The БЖУ segment renders all-or-nothing per `hasBzu`.

- [ ] **Step 3: Type-check + build**

Run: `pnpm tsc --noEmit`
Expected: PASS.

Run: `pnpm next build` (or whichever build the project uses).
Expected: PASS.

- [ ] **Step 4: Visual verification — run dev server, open `/menu`**

Run: `pnpm dev` (or `npm run dev`). Open `http://localhost:3000/menu`. Find any dish with full nutrition (e.g. "Луковые кольца", weight 180g, kcal_per_100g 460 → expect `180 г · 828 ккал · 9/47/83 бжу`). Confirm the meta line reads as expected.

Also verify edge cases:
- A dish with only weight (e.g. cocktails in fixture: weight 90, no kcal/БЖУ) → shows just `90 г`.
- A dish with weight + kcal but no БЖУ → shows `XXX г · YYY ккал` (no БЖУ segment).
- A dish with NULL weight → no segments render (meta row hidden by `hasMeta`).

- [ ] **Step 5: Commit Tasks 6 + 7 together**

```bash
git add src/menu/copy.ts src/app/menu/_components/DishCard.tsx
git commit -m "feat(menu): show per-portion вес · ккал · Б/Ж/У бжу on dish card"
```

---

### Task 8: Update `build_apply_sql.py` to write `*_per_100g`

**Files:**
- Modify: `scripts/menu/build_apply_sql.py:66-73`

- [ ] **Step 1: Rename target columns in the UPDATE SETs**

Replace the `sets = [...]` block (lines 66–77) with:

```python
        sets = [
            f"ingredients = {sql_str(x.ingredients)}",
            f"weight_g = {sql_int(x.weight_g)}",
            f"weight_label = {sql_str(x.weight_label)}",
            f"kcal_per_100g = {sql_int(x.kcal)}",
            f"protein_per_100g = {sql_int(x.protein)}",
            f"fat_per_100g = {sql_int(x.fat)}",
            f"carbs_per_100g = {sql_int(x.carbs)}",
            "ingredients_source = 'xlsx'",
            "nutrition_source = 'xlsx'",
            "updated_at = now()",
        ]
```

- [ ] **Step 2: Sanity-run the generator against an existing xlsx + dishes-json**

If the founder has `tmp/dishes.json` and the XLSX handy, run:

```bash
python3 scripts/menu/build_apply_sql.py \
  --xlsx "$XLSX_PATH" \
  --dishes-json tmp/dishes.json \
  --out tmp/ingest-apply.sql
```

Expected: file written; `head tmp/ingest-apply.sql` shows `UPDATE menu.dishes SET … kcal_per_100g = … protein_per_100g = …`. **Do not apply** — that's a separate human-reviewed step.

If the XLSX path isn't available locally, skip the smoke run; rely on a code read.

- [ ] **Step 3: Commit**

```bash
git add scripts/menu/build_apply_sql.py
git commit -m "fix(scripts): write nutrition to *_per_100g columns"
```

---

### Task 9: End-to-end verification

- [ ] **Step 1: Verify a known dish end-to-end**

Pick "Луковые кольца" (`id = d29`, weight_g=180, was kcal=460). Via MCP `execute_sql`:

```sql
select id, name, weight_g, kcal_per_100g, kcal_per_portion,
       protein_per_100g, protein_per_portion,
       fat_per_100g, fat_per_portion,
       carbs_per_100g, carbs_per_portion
from menu.dishes where id = 'd29';
```

Expected (given weight_g=180): `kcal_per_portion = round(460*180/100) = 828`, `protein_per_portion = round(5*180/100) = 9`, `fat_per_portion = round(26*180/100) = 47`, `carbs_per_portion = round(46*180/100) = 83`.

- [ ] **Step 2: Visit the live (or local dev) menu**

Reload `/menu`, find that dish, confirm card reads `180 г · 828 ккал · 9/47/83 бжу`. Open the detail sheet, confirm the same numbers appear in the БЖУ grid (the cells labelled бел./жир./угл.).

- [ ] **Step 3: Verify DQ views still work**

```sql
select * from menu.dq_summary order by category;
```

Expected: rows returned, `missing_kcal` counts look the same as before the migration (since `kcal_per_100g` retains the original value).

- [ ] **Step 4: Final commit (only if anything stragging)** — otherwise nothing to commit.

---

## Self-Review

**Spec coverage:**
- Schema change (rename + generated cols) → Task 2 ✓
- DQ views recreated → Task 2 ✓
- DishRow type update → Task 3 ✓
- hydrateDishes mapping → Task 4 ✓
- Fixture conversion → Task 5 (no-op + comment; documented why) ✓
- DishCard compact line `вес · ккал · Б/Ж/У бжу` → Task 7 ✓
- Detail sheet unchanged (uses Dish.kcal etc. semantics) → covered implicitly by Tasks 3–4 ✓
- `build_apply_sql.py` target column rename → Task 8 ✓
- Verification → Task 9 ✓

**Placeholders:** none — every step has the actual code/SQL/command.

**Type/name consistency:** `kcal_per_100g`/`kcal_per_portion` etc. are spelled the same in SQL, TS, and Python. `copy.detail.nut.bzu = 'бжу'` matches the JSX use.

**Notes left for executor judgment:**
- Migration filename uses `0003_` assuming sequential numbering; if `supabase/migrations/` already has higher numbers on disk, pick the next free one.
- Python smoke run in Task 8 Step 2 is best-effort and may be skipped if XLSX isn't local.
