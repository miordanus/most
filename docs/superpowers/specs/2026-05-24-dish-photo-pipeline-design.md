# Dish-photo pipeline — design

## Context

The МОСТ menu MVP (`menu.restobarmost.ru`) renders dishes via `next/image` in `src/app/menu/_components/brand/DishMedia.tsx`, but `dishes.photo_url` is currently `null` for every row — guests see the `<ArchPlaceholder />` fallback. The founder has 20–50 dish photos locally as JPG/PNG of mixed sizes and provenance, with camera-style filenames (no dish identifiers in the name). The Amvera deploy is stateless (`public/` is ephemeral), so photos must live in Supabase Storage. The data model uses `photo_source` to track whether a photo is real or mockup, and `mock_status` is the replacement-queue flag.

Goal: a fast, repeatable pipeline to (1) optimize local originals, (2) match each photo to its dish via a small local UI, (3) upload to Supabase Storage and populate `photo_url` + flip `photo_source` to `menu_photo` in one click.

## Architecture

Three pieces, all local-only:

1. **CLI stager** — `scripts/menu/photos_stage.mjs <source_dir>` converts originals → optimized WebP into `tmp/photos-staged/` plus a `_manifest.json`.
2. **Picker page** — `/admin/photo-match` in the existing Next app, gated by `PHOTO_ADMIN_TOKEN` env var. Reads the manifest, shows one photo at a time with a searchable dish dropdown, keyboard-driven.
3. **Apply API** — `POST /api/admin/photo-match/apply` uploads the staged file to Supabase Storage (`dishes` bucket) and updates `dishes.photo_url` + `photo_source` + recomputes `mock_status` in one statement.

Originals never enter the repo; staged WebPs are gitignored.

## Schema (verified)

`menu.dishes` columns (confirmed via `information_schema`):
- `id text NOT NULL`, `photo_url text NULL`, `photo_source text NOT NULL`
- `name_source/description_source/ingredients_source/price_source/nutrition_source text NOT NULL`
- `short_source text NULL` (only nullable one)
- `mock_status text NULL`

## Components

### 1. CLI stager — `scripts/menu/photos_stage.mjs`

Node ESM script using `sharp` (new devDependency).

- **Args:** `<source_dir>` (required), `--out tmp/photos-staged` (default), `--width 1600`, `--quality 82`.
- **Per file** (`.jpg/.jpeg/.png/.heic` case-insensitive):
  - `sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).withMetadata({})` — `rotate()` honours EXIF orientation, `withMetadata({})` strips EXIF/GPS.
  - Output: `<out>/<original_basename>.webp` (basename without extension).
  - Skip if output already exists (idempotent — safe to re-run).
- **Writes** `<out>/_manifest.json`:
  ```json
  [{ "staged": "IMG_1234.webp", "source": "IMG_1234.HEIC", "bytes_in": 4123456, "bytes_out": 132018, "w": 1600, "h": 1067, "matched_dish_id": null }]
  ```
- **Prints** summary table: `47 photos · 184 MB → 6.2 MB (avg 132 KB)`.

### 2. Picker page — `src/app/admin/photo-match/page.tsx`

Server-rendered shell + client component for interaction.

- **Auth gate:** `if (!process.env.PHOTO_ADMIN_TOKEN || searchParams.t !== process.env.PHOTO_ADMIN_TOKEN) return notFound()`. In Amvera (where the env var is unset) the route 404s.
- **Server data:** reads `tmp/photos-staged/_manifest.json` and the full dish list (id, name, category, price, has_photo) from Supabase using `supabaseServer`.
- **Client UI:**
  - Progress bar: `12 / 47 matched`.
  - Current photo preview (~600px wide) — served via a tiny `/api/admin/photo-match/preview?file=<basename>` route that streams the staged WebP (also token-gated).
  - Searchable combobox of dishes. Format: `Чизбургер · burgers · 690 ₽ · [no photo]`. Russian fuzzy match using a normalizer in `src/lib/menu/normalize.ts`.
  - Dishes that already have a photo are greyed with `[replace?]`; selecting one triggers a confirm.
  - Keyboard: `Enter` apply → advance, `S` skip-to-end, `D` delete staged file, `→/←` next/back without action.
- **Done state:** when manifest queue is empty, page shows summary.

### 3. Apply API — `src/app/api/admin/photo-match/apply/route.ts`

Server-only (uses `SUPABASE_SERVICE_ROLE_KEY` via a new `src/lib/supabase/service.ts`). POST body: `{ staged_filename, dish_id, replace?: boolean }`.

1. Re-check token (header `x-photo-admin-token`).
2. Read `tmp/photos-staged/<staged_filename>` from disk.
3. Compute `v = sha1(buf).slice(0,6)` for cache-busting.
4. Upload to Storage:
   ```ts
   supabase.storage.from('dishes').upload(`${dish_id}.webp`, buf, {
     upsert: true,
     contentType: 'image/webp',
     cacheControl: '31536000, immutable',
   })
   ```
5. `publicUrl = supabase.storage.from('dishes').getPublicUrl(`${dish_id}.webp`).data.publicUrl + `?v=${v}``.
6. DB update (single statement; `coalesce` handles nullable `short_source`):
   ```sql
   UPDATE menu.dishes
   SET photo_url = $1,
       photo_source = 'menu_photo',
       mock_status = CASE
         WHEN name_source <> 'mockup'
              AND coalesce(short_source, '') <> 'mockup'
              AND description_source <> 'mockup'
              AND ingredients_source <> 'mockup'
              AND price_source <> 'mockup'
              AND nutrition_source <> 'mockup'
           THEN NULL
         ELSE mock_status
       END
   WHERE id = $2;
   ```
7. Update `_manifest.json` to mark `matched_dish_id`.
8. `revalidatePath('/menu')` so the change appears before the 5-min ISR window.
9. Return `{ ok: true, public_url }`.

## Data flow / contracts

- **Bucket:** `dishes`, public, created via `apply_migration`:
  ```sql
  insert into storage.buckets (id, name, public)
    values ('dishes', 'dishes', true)
    on conflict (id) do nothing;
  create policy "public read dishes"
    on storage.objects for select using (bucket_id = 'dishes');
  ```
  Writes go through the service role (bypasses RLS).
- **Filename:** `<dish_id>.webp` — deterministic, re-shoots overwrite cleanly. Cache-busting via `?v=<short_sha1>` suffix on the stored `photo_url`.
- **Source flag:** `photo_source` flips from `mockup`/`unknown` to `menu_photo`. `mock_status` clears to `null` only if no other field is still `mockup`.
- **next/image** already whitelists `sfzyqdpckgyznuhunygj.supabase.co` — no config change needed.

## Files added / changed

- `scripts/menu/photos_stage.mjs` *(new)*
- `src/app/admin/photo-match/page.tsx` *(new)* + co-located `client.tsx`
- `src/app/api/admin/photo-match/apply/route.ts` *(new)*
- `src/app/api/admin/photo-match/preview/route.ts` *(new)*
- `src/lib/menu/normalize.ts` *(new)*
- `src/lib/supabase/service.ts` *(new)*
- `package.json` — add `sharp` to `devDependencies`
- `.gitignore` — add `tmp/photos-staged/`
- Supabase migration — create `dishes` bucket + public-read policy

## Verification

1. Stager smoke: 2–3 throwaway JPGs → run script → `tmp/photos-staged/*.webp` exists, each <200 KB, manifest valid.
2. Bucket: apply migration, confirm via Supabase MCP.
3. Picker auth: `/admin/photo-match` → 404; with `?t=<token>` → UI loads.
4. Apply: match one photo → `dishes.photo_url` populated, `photo_source='menu_photo'`, `mock_status` recomputed, `/menu` shows the photo.
5. Cache-bust: re-apply same dish → `?v=` changes.
6. Prod guard: build with `PHOTO_ADMIN_TOKEN` unset → routes 404.
