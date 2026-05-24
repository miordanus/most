# Dish-photo pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a local-only pipeline to optimize, name, and upload dish photos from the founder's Mac into Supabase Storage, populating `menu.dishes.photo_url` and flipping `photo_source='menu_photo'` per match.

**Architecture:** Three pieces — (1) Node CLI stager (`scripts/menu/photos_stage.mjs`) using `sharp` to make WebPs into `tmp/photos-staged/`; (2) gated picker page `/admin/photo-match` in the Next app for filename→dish matching; (3) API route that uploads to Supabase Storage and updates the DB in one shot. All admin surfaces 404 unless `PHOTO_ADMIN_TOKEN` env var matches.

**Tech Stack:** Next.js 14 (app router), Supabase (`@supabase/supabase-js` v2 — service role for writes), `sharp` (new devDependency for image conversion), Supabase Storage (public bucket `dishes`).

**Spec:** `docs/superpowers/specs/2026-05-24-dish-photo-pipeline-design.md`

---

## Task 1: Add `sharp` and ignore staged output

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Install sharp as a devDependency**

Run from repo root:
```bash
npm install --save-dev sharp@^0.33
```
Expected: `package.json` gains `"sharp": "^0.33.x"` under `devDependencies`, `package-lock.json` updates.

- [ ] **Step 2: Ignore the staged-photos tmp directory**

Append to `.gitignore`:
```
# dish-photo pipeline staged output
tmp/photos-staged/
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: add sharp + ignore photo staging dir"
```

---

## Task 2: Create the Supabase Storage `dishes` bucket

**Files:**
- Migration applied via Supabase MCP (no local SQL file; project uses MCP-driven schema changes).

- [ ] **Step 1: Apply the bucket + policy migration**

Use Supabase MCP `apply_migration` with name `create_dishes_bucket` and SQL:
```sql
insert into storage.buckets (id, name, public)
  values ('dishes', 'dishes', true)
  on conflict (id) do nothing;

create policy "public read dishes"
  on storage.objects for select
  using (bucket_id = 'dishes');
```
Expected: migration succeeds. Bucket `dishes` visible in Supabase dashboard, marked public.

- [ ] **Step 2: Verify via SQL**

Use Supabase MCP `execute_sql`:
```sql
select id, name, public from storage.buckets where id = 'dishes';
select polname from pg_policies where schemaname='storage' and tablename='objects' and polname='public read dishes';
```
Expected: one row each. `public = true`.

---

## Task 3: Write the CLI stager — failing test

**Files:**
- Create: `scripts/menu/photos_stage.test.mjs`
- Create test fixtures: `scripts/menu/__fixtures__/small.jpg` (a tiny throwaway JPG — generate with sharp inline in the test setup)

- [ ] **Step 1: Write the failing test**

Create `scripts/menu/photos_stage.test.mjs`:
```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { stagePhotos } from './photos_stage.mjs'

async function setupSourceDir() {
  const dir = mkdtempSync(join(tmpdir(), 'photos-src-'))
  // Create one wide JPG (3000x2000) and one already-small PNG (400x300)
  await sharp({
    create: { width: 3000, height: 2000, channels: 3, background: { r: 200, g: 50, b: 50 } },
  }).jpeg().toFile(join(dir, 'IMG_BIG.jpg'))
  await sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 50, g: 200, b: 50 } },
  }).png().toFile(join(dir, 'IMG_SMALL.png'))
  return dir
}

test('stagePhotos converts to WebP, respects withoutEnlargement, writes manifest', async () => {
  const src = await setupSourceDir()
  const out = mkdtempSync(join(tmpdir(), 'photos-out-'))
  try {
    const result = await stagePhotos({ sourceDir: src, outDir: out, width: 1600, quality: 82 })

    assert.equal(result.processed.length, 2, 'should process 2 images')
    assert.ok(existsSync(join(out, 'IMG_BIG.webp')))
    assert.ok(existsSync(join(out, 'IMG_SMALL.webp')))

    const big = await sharp(join(out, 'IMG_BIG.webp')).metadata()
    assert.equal(big.format, 'webp')
    assert.equal(big.width, 1600, 'big image should downscale to 1600')

    const small = await sharp(join(out, 'IMG_SMALL.webp')).metadata()
    assert.equal(small.width, 400, 'small image must NOT be enlarged')

    const manifest = JSON.parse(readFileSync(join(out, '_manifest.json'), 'utf8'))
    assert.equal(manifest.length, 2)
    for (const entry of manifest) {
      assert.ok(entry.staged.endsWith('.webp'))
      assert.ok(typeof entry.bytes_in === 'number' && entry.bytes_in > 0)
      assert.ok(typeof entry.bytes_out === 'number' && entry.bytes_out > 0)
      assert.equal(entry.matched_dish_id, null)
    }
  } finally {
    rmSync(src, { recursive: true, force: true })
    rmSync(out, { recursive: true, force: true })
  }
})

test('stagePhotos is idempotent — second run skips existing outputs', async () => {
  const src = await setupSourceDir()
  const out = mkdtempSync(join(tmpdir(), 'photos-out-'))
  try {
    const first = await stagePhotos({ sourceDir: src, outDir: out, width: 1600, quality: 82 })
    assert.equal(first.processed.length, 2)
    assert.equal(first.skipped.length, 0)

    const second = await stagePhotos({ sourceDir: src, outDir: out, width: 1600, quality: 82 })
    assert.equal(second.processed.length, 0)
    assert.equal(second.skipped.length, 2)
  } finally {
    rmSync(src, { recursive: true, force: true })
    rmSync(out, { recursive: true, force: true })
  }
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:
```bash
node --test scripts/menu/photos_stage.test.mjs
```
Expected: FAIL with `Cannot find module './photos_stage.mjs'` or similar.

---

## Task 4: Implement the CLI stager

**Files:**
- Create: `scripts/menu/photos_stage.mjs`

- [ ] **Step 1: Implement `stagePhotos` and a CLI entry point**

Create `scripts/menu/photos_stage.mjs`:
```javascript
#!/usr/bin/env node
import { readdirSync, mkdirSync, statSync, existsSync, writeFileSync } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic'])

export async function stagePhotos({ sourceDir, outDir, width = 1600, quality = 82 }) {
  if (!existsSync(sourceDir)) throw new Error(`source dir not found: ${sourceDir}`)
  mkdirSync(outDir, { recursive: true })

  const entries = readdirSync(sourceDir)
    .filter((f) => EXTENSIONS.has(extname(f).toLowerCase()))
    .sort()

  const processed = []
  const skipped = []

  for (const filename of entries) {
    const stagedName = basename(filename, extname(filename)) + '.webp'
    const outPath = join(outDir, stagedName)
    const inPath = join(sourceDir, filename)

    if (existsSync(outPath)) {
      skipped.push(stagedName)
      continue
    }

    const bytesIn = statSync(inPath).size
    const buf = await sharp(inPath)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .withMetadata({})
      .toBuffer({ resolveWithObject: true })

    writeFileSync(outPath, buf.data)

    processed.push({
      staged: stagedName,
      source: filename,
      bytes_in: bytesIn,
      bytes_out: buf.data.length,
      w: buf.info.width,
      h: buf.info.height,
      matched_dish_id: null,
    })
  }

  // Manifest: preserve any existing matched_dish_id values, append new entries
  const manifestPath = join(outDir, '_manifest.json')
  let existing = []
  if (existsSync(manifestPath)) {
    try { existing = JSON.parse(readFileSyncIfExists(manifestPath)) } catch { existing = [] }
  }
  const existingByName = new Map(existing.map((e) => [e.staged, e]))
  for (const p of processed) existingByName.set(p.staged, p)
  const manifest = Array.from(existingByName.values()).sort((a, b) => a.staged.localeCompare(b.staged))
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  return { processed, skipped, manifest }
}

function readFileSyncIfExists(p) {
  // small helper so test stays clean
  const { readFileSync } = require('node:fs')
  return readFileSync(p, 'utf8')
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0 || args[0].startsWith('-')) {
    console.error('usage: node scripts/menu/photos_stage.mjs <source_dir> [--out tmp/photos-staged] [--width 1600] [--quality 82]')
    process.exit(1)
  }
  const sourceDir = args[0]
  const opts = { sourceDir, outDir: 'tmp/photos-staged', width: 1600, quality: 82 }
  for (let i = 1; i < args.length; i += 2) {
    const k = args[i].replace(/^--/, '')
    const v = args[i + 1]
    if (k === 'out') opts.outDir = v
    else if (k === 'width') opts.width = Number(v)
    else if (k === 'quality') opts.quality = Number(v)
  }
  const { processed, skipped, manifest } = await stagePhotos(opts)
  const totalIn = processed.reduce((s, e) => s + e.bytes_in, 0)
  const totalOut = processed.reduce((s, e) => s + e.bytes_out, 0)
  console.log(`processed: ${processed.length} · skipped: ${skipped.length} · total in DB: ${manifest.length}`)
  if (processed.length > 0) {
    console.log(`bytes: ${fmtBytes(totalIn)} → ${fmtBytes(totalOut)} (avg ${fmtBytes(Math.round(totalOut / processed.length))})`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1) })
}
```

Note: the `readFileSyncIfExists` helper uses `require('node:fs')` which doesn't work in pure ESM. Replace its body with a top-level `import { readFileSync } from 'node:fs'` and call `readFileSync(p, 'utf8')` directly. (Fix this now — leaving the require would break.)

Final imports section at top should be:
```javascript
import { readdirSync, mkdirSync, statSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
```
And delete the `readFileSyncIfExists` helper, inlining the read:
```javascript
if (existsSync(manifestPath)) {
  try { existing = JSON.parse(readFileSync(manifestPath, 'utf8')) } catch { existing = [] }
}
```

- [ ] **Step 2: Run the tests and verify they pass**

Run:
```bash
node --test scripts/menu/photos_stage.test.mjs
```
Expected: both tests PASS.

- [ ] **Step 3: Manual smoke test**

```bash
mkdir -p /tmp/photos-smoke && cp src/app/assets/*.png /tmp/photos-smoke/ 2>/dev/null || cp public/assets/*.png /tmp/photos-smoke/
node scripts/menu/photos_stage.mjs /tmp/photos-smoke --out tmp/photos-staged
ls -la tmp/photos-staged/
```
Expected: `_manifest.json` + `*.webp` files exist; summary line printed.

- [ ] **Step 4: Commit**

```bash
git add scripts/menu/photos_stage.mjs scripts/menu/photos_stage.test.mjs
git commit -m "feat(scripts): photo stager — convert originals to webp with manifest"
```

---

## Task 5: Russian-text normalizer for fuzzy search — failing test

**Files:**
- Create: `src/lib/menu/normalize.test.ts`

The picker dropdown needs Russian-friendly fuzzy match. We build a small dependency-free normalizer (lowercase, strip diacritics, ё→е, collapse whitespace, drop punctuation).

- [ ] **Step 1: Add a minimal test runner if absent**

Check `package.json` — if no `"test"` script exists, add:
```json
"test": "node --import tsx --test \"src/**/*.test.ts\""
```
And install `tsx` if not present:
```bash
npm install --save-dev tsx
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/menu/normalize.test.ts`:
```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeRu, fuzzyMatch } from './normalize'

test('normalizeRu folds ё→е, strips punctuation, lowercases, collapses whitespace', () => {
  assert.equal(normalizeRu('Клуб-Сэндвич, с куриным филе'), 'клуб сэндвич с куриным филе')
  assert.equal(normalizeRu('Ёжик'), 'ежик')
  assert.equal(normalizeRu('  multiple   spaces  '), 'multiple spaces')
})

test('fuzzyMatch returns true for substring after normalization', () => {
  assert.equal(fuzzyMatch('Чизбургер', 'чиз'), true)
  assert.equal(fuzzyMatch('Клаб-сэндвич с куриным филе', 'клуб сэндвич'), true)
  assert.equal(fuzzyMatch('Цезарь', 'кесарь'), false)
})

test('fuzzyMatch tolerates word-order-insensitive token match', () => {
  // every needle token must appear somewhere in the haystack
  assert.equal(fuzzyMatch('Куриный салат с пармезаном', 'пармезан куриный'), true)
  assert.equal(fuzzyMatch('Куриный салат', 'грибной'), false)
})
```

- [ ] **Step 3: Run and verify it fails**

```bash
npm test
```
Expected: FAIL with `Cannot find module './normalize'`.

---

## Task 6: Implement the normalizer

**Files:**
- Create: `src/lib/menu/normalize.ts`

- [ ] **Step 1: Implement**

Create `src/lib/menu/normalize.ts`:
```typescript
export function normalizeRu(input: string): string {
  return input
    .toLowerCase()
    .replace(/ё/g, 'е')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function fuzzyMatch(haystack: string, needle: string): boolean {
  const h = normalizeRu(haystack)
  const tokens = normalizeRu(needle).split(' ').filter(Boolean)
  if (tokens.length === 0) return true
  return tokens.every((t) => h.includes(t))
}
```

- [ ] **Step 2: Run tests, verify pass**

```bash
npm test
```
Expected: all 3 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/menu/normalize.ts src/lib/menu/normalize.test.ts package.json package-lock.json
git commit -m "feat(menu): russian-text normalizer + fuzzy match"
```

---

## Task 7: Service-role Supabase client factory

**Files:**
- Create: `src/lib/supabase/service.ts`

The picker's API routes must write to `menu.dishes` and Storage. Anon key cannot. This factory builds a service-role client on first call and reuses it.

- [ ] **Step 1: Implement**

Create `src/lib/supabase/service.ts`:
```typescript
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

export function supabaseService(): SupabaseClient {
  if (cached) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for admin routes')
  }
  cached = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: 'menu' },
  })
  return cached
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase/service.ts
git commit -m "feat(supabase): service-role client factory for admin routes"
```

---

## Task 8: Shared token-gate helper

**Files:**
- Create: `src/app/admin/photo-match/_auth.ts`

Used by both the page and the two API routes. Centralizes the env-var + token check so all three surfaces 404 identically.

- [ ] **Step 1: Implement**

Create `src/app/admin/photo-match/_auth.ts`:
```typescript
export function checkPhotoAdminToken(provided: string | null | undefined): boolean {
  const expected = process.env.PHOTO_ADMIN_TOKEN
  if (!expected) return false
  if (!provided) return false
  return provided === expected
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/photo-match/_auth.ts
git commit -m "feat(admin): shared photo-admin token gate"
```

---

## Task 9: Preview API route — streams a staged WebP

**Files:**
- Create: `src/app/api/admin/photo-match/preview/route.ts`

- [ ] **Step 1: Implement**

Create `src/app/api/admin/photo-match/preview/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { checkPhotoAdminToken } from '@/app/admin/photo-match/_auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t')
  if (!checkPhotoAdminToken(token)) {
    return new Response('Not found', { status: 404 })
  }
  const file = req.nextUrl.searchParams.get('file')
  if (!file) return new Response('Bad request', { status: 400 })

  // basename() prevents path traversal — anything with /, .., etc collapses to the last segment
  const safe = basename(file)
  if (!safe.endsWith('.webp')) return new Response('Bad request', { status: 400 })

  try {
    const buf = await readFile(join(process.cwd(), 'tmp/photos-staged', safe))
    return new Response(buf, {
      status: 200,
      headers: { 'content-type': 'image/webp', 'cache-control': 'no-store' },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/photo-match/preview/route.ts
git commit -m "feat(admin): photo-match preview route streams staged webp"
```

---

## Task 10: Apply API route — uploads to Storage + updates DB

**Files:**
- Create: `src/app/api/admin/photo-match/apply/route.ts`

- [ ] **Step 1: Implement**

Create `src/app/api/admin/photo-match/apply/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { checkPhotoAdminToken } from '@/app/admin/photo-match/_auth'
import { supabaseService } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Body = { staged_filename: string; dish_id: string; replace?: boolean }

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-photo-admin-token')
  if (!checkPhotoAdminToken(token)) {
    return new NextResponse('Not found', { status: 404 })
  }

  let body: Body
  try { body = (await req.json()) as Body } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const safeFile = basename(body.staged_filename || '')
  if (!safeFile.endsWith('.webp')) {
    return NextResponse.json({ error: 'staged_filename must be .webp' }, { status: 400 })
  }
  if (!body.dish_id || typeof body.dish_id !== 'string') {
    return NextResponse.json({ error: 'dish_id required' }, { status: 400 })
  }

  // 1. Read staged file
  const stagedRoot = join(process.cwd(), 'tmp/photos-staged')
  const stagedPath = join(stagedRoot, safeFile)
  let buf: Buffer
  try { buf = await readFile(stagedPath) } catch {
    return NextResponse.json({ error: 'staged file not found' }, { status: 404 })
  }

  // 2. Upload to Storage (upsert)
  const sb = supabaseService()
  const objectKey = `${body.dish_id}.webp`
  const up = await sb.storage.from('dishes').upload(objectKey, buf, {
    upsert: true,
    contentType: 'image/webp',
    cacheControl: '31536000, immutable',
  })
  if (up.error) {
    return NextResponse.json({ error: `storage upload failed: ${up.error.message}` }, { status: 500 })
  }

  // 3. Compute cache-busting suffix from content hash
  const v = createHash('sha1').update(buf).digest('hex').slice(0, 6)
  const publicUrl = sb.storage.from('dishes').getPublicUrl(objectKey).data.publicUrl + `?v=${v}`

  // 4. Update menu.dishes
  const updateSql = `
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
    WHERE id = $2
    RETURNING id, photo_url, photo_source, mock_status
  `
  // supabase-js v2 has no direct parameterized SQL; use rpc OR call the table API.
  // Easiest: two-step — first SELECT current source flags, then UPDATE via the table API.
  const sel = await sb.from('dishes')
    .select('name_source,short_source,description_source,ingredients_source,price_source,nutrition_source,mock_status')
    .eq('id', body.dish_id)
    .maybeSingle()
  if (sel.error) return NextResponse.json({ error: `select failed: ${sel.error.message}` }, { status: 500 })
  if (!sel.data) return NextResponse.json({ error: 'dish not found' }, { status: 404 })

  const stillMocked =
    sel.data.name_source === 'mockup' ||
    (sel.data.short_source ?? '') === 'mockup' ||
    sel.data.description_source === 'mockup' ||
    sel.data.ingredients_source === 'mockup' ||
    sel.data.price_source === 'mockup' ||
    sel.data.nutrition_source === 'mockup'

  const upd = await sb.from('dishes')
    .update({
      photo_url: publicUrl,
      photo_source: 'menu_photo',
      mock_status: stillMocked ? sel.data.mock_status : null,
    })
    .eq('id', body.dish_id)
    .select('id, photo_url, photo_source, mock_status')
    .maybeSingle()
  if (upd.error) return NextResponse.json({ error: `update failed: ${upd.error.message}` }, { status: 500 })

  // 5. Update manifest entry
  const manifestPath = join(stagedRoot, '_manifest.json')
  try {
    const raw = await readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(raw) as Array<Record<string, unknown>>
    for (const e of manifest) {
      if (e.staged === safeFile) e.matched_dish_id = body.dish_id
    }
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  } catch {
    // manifest update is non-fatal — log but don't error the request
    console.warn('failed to update manifest for', safeFile)
  }

  // 6. Bust ISR cache
  revalidatePath('/menu')

  return NextResponse.json({ ok: true, public_url: publicUrl, row: upd.data })
}
```

The unused `updateSql` constant is left as a doc comment of intended SQL — delete the `const updateSql = ...` block before committing; the table API call is what actually runs.

- [ ] **Step 2: Remove the unused SQL doc block**

Delete the entire `const updateSql = \`...\`` block from the file (keep the surrounding select+update logic).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/photo-match/apply/route.ts
git commit -m "feat(admin): photo-match apply route — upload + update dish row"
```

---

## Task 11: Picker page — server shell

**Files:**
- Create: `src/app/admin/photo-match/page.tsx`

- [ ] **Step 1: Implement**

Create `src/app/admin/photo-match/page.tsx`:
```typescript
import { notFound } from 'next/navigation'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { supabaseServer } from '@/lib/supabase/server'
import { checkPhotoAdminToken } from './_auth'
import { PhotoMatchClient } from './client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata = {
  robots: { index: false, follow: false },
}

type ManifestEntry = {
  staged: string
  source: string
  bytes_in: number
  bytes_out: number
  w: number
  h: number
  matched_dish_id: string | null
}

export default async function PhotoMatchPage({
  searchParams,
}: { searchParams: { t?: string } }) {
  if (!checkPhotoAdminToken(searchParams.t)) notFound()

  let manifest: ManifestEntry[] = []
  try {
    const raw = await readFile(
      join(process.cwd(), 'tmp/photos-staged/_manifest.json'),
      'utf8',
    )
    manifest = JSON.parse(raw)
  } catch {
    manifest = []
  }

  const [catsRes, dishesRes] = await Promise.all([
    supabaseServer.from('categories').select('id,name,sort_order').order('sort_order'),
    supabaseServer.from('dishes')
      .select('id,name,category,price,photo_url')
      .order('sort_order'),
  ])
  if (catsRes.error) throw catsRes.error
  if (dishesRes.error) throw dishesRes.error

  return (
    <PhotoMatchClient
      token={searchParams.t!}
      manifest={manifest}
      categories={catsRes.data ?? []}
      dishes={dishesRes.data ?? []}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/photo-match/page.tsx
git commit -m "feat(admin): photo-match page shell — token gate + data fetch"
```

---

## Task 12: Picker page — client UI

**Files:**
- Create: `src/app/admin/photo-match/client.tsx`

- [ ] **Step 1: Implement**

Create `src/app/admin/photo-match/client.tsx`:
```typescript
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { fuzzyMatch } from '@/lib/menu/normalize'

type ManifestEntry = {
  staged: string
  source: string
  matched_dish_id: string | null
}
type Category = { id: string; name: string; sort_order: number }
type Dish = { id: string; name: string; category: string; price: number | null; photo_url: string | null }

export function PhotoMatchClient({
  token,
  manifest: initialManifest,
  categories,
  dishes,
}: {
  token: string
  manifest: ManifestEntry[]
  categories: Category[]
  dishes: Dish[]
}) {
  const [manifest, setManifest] = useState(initialManifest)
  const [cursor, setCursor] = useState(() =>
    manifest.findIndex((e) => !e.matched_dish_id),
  )
  const [query, setQuery] = useState('')
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const total = manifest.length
  const matched = manifest.filter((e) => e.matched_dish_id).length
  const current = cursor >= 0 ? manifest[cursor] : null

  const catName = useMemo(() => {
    const m = new Map(categories.map((c) => [c.id, c.name]))
    return (id: string) => m.get(id) ?? id
  }, [categories])

  const filtered = useMemo(() => {
    if (!query.trim()) return dishes.slice(0, 30)
    return dishes.filter((d) => fuzzyMatch(`${d.name} ${catName(d.category)}`, query)).slice(0, 30)
  }, [dishes, query, catName])

  useEffect(() => { inputRef.current?.focus() }, [cursor])

  function advance() {
    setQuery('')
    setSelectedDishId(null)
    const next = manifest.findIndex((e, i) => i > cursor && !e.matched_dish_id)
    setCursor(next)
  }

  async function applyMatch(dishId: string, replace = false) {
    if (!current) return
    setStatus('uploading…')
    const res = await fetch('/api/admin/photo-match/apply', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-photo-admin-token': token },
      body: JSON.stringify({ staged_filename: current.staged, dish_id: dishId, replace }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setStatus(`error: ${data.error ?? res.status}`)
      return
    }
    setStatus('matched')
    setManifest((m) => m.map((e, i) => i === cursor ? { ...e, matched_dish_id: dishId } : e))
    advance()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault()
      const target = selectedDishId ?? filtered[0].id
      const dish = dishes.find((d) => d.id === target)
      if (dish?.photo_url) {
        if (!confirm(`«${dish.name}» уже имеет фото. Заменить?`)) return
        applyMatch(target, true)
      } else {
        applyMatch(target)
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      advance()
    }
  }

  if (!current) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Все фото сматчены</h1>
        <p>{matched} / {total} matched.</p>
        <p>Можно удалить <code>tmp/photos-staged/</code>.</p>
      </main>
    )
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 760 }}>
      <div style={{ marginBottom: 12, fontSize: 14, color: '#666' }}>
        {matched} / {total} matched · {current.source}
      </div>
      <img
        src={`/api/admin/photo-match/preview?file=${encodeURIComponent(current.staged)}&t=${encodeURIComponent(token)}`}
        alt={current.source}
        style={{ width: '100%', maxWidth: 600, borderRadius: 8, display: 'block', marginBottom: 16 }}
      />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setSelectedDishId(null) }}
        onKeyDown={onKeyDown}
        placeholder="Поиск блюда…"
        style={{ width: '100%', padding: 12, fontSize: 16, marginBottom: 8 }}
      />
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 320, overflow: 'auto', border: '1px solid #eee' }}>
        {filtered.map((d) => {
          const isPicked = selectedDishId === d.id
          return (
            <li
              key={d.id}
              onClick={() => setSelectedDishId(d.id)}
              onDoubleClick={() => {
                if (d.photo_url && !confirm(`«${d.name}» уже имеет фото. Заменить?`)) return
                applyMatch(d.id, !!d.photo_url)
              }}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                background: isPicked ? '#ffd' : 'transparent',
                opacity: d.photo_url ? 0.55 : 1,
                borderBottom: '1px solid #f4f4f4',
              }}
            >
              <strong>{d.name}</strong>
              <span style={{ marginLeft: 8, color: '#888', fontSize: 13 }}>
                · {catName(d.category)}
                {d.price != null ? ` · ${d.price} ₽` : ''}
                {d.photo_url ? ' · [есть фото — replace?]' : ''}
              </span>
            </li>
          )
        })}
      </ul>
      <div style={{ marginTop: 12, fontSize: 13, color: '#666' }}>
        Enter — применить выбор · → пропустить · status: {status || 'idle'}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/photo-match/client.tsx
git commit -m "feat(admin): photo-match client — searchable picker UI"
```

---

## Task 13: Document env vars + local-dev quickstart

**Files:**
- Create or modify: `README.md`

- [ ] **Step 1: Add a "Photos" section to README**

Append to `README.md`:
```markdown
## Dish photos

To add or replace dish photos:

1. Drop originals into any folder, e.g. `~/Desktop/most-photos/`.
2. Stage them (converts to WebP, writes `tmp/photos-staged/_manifest.json`):
   ```bash
   node scripts/menu/photos_stage.mjs ~/Desktop/most-photos
   ```
3. Set the admin envs in `.env.local` (never commit, never set on Amvera):
   ```
   PHOTO_ADMIN_TOKEN=<random-string>
   SUPABASE_SERVICE_ROLE_KEY=<from supabase dashboard>
   ```
4. Run `npm run dev`, open `http://localhost:3000/admin/photo-match?t=<token>`.
5. Click through: pick the matching dish for each photo, hit Enter. Each match uploads to Supabase Storage (`dishes` bucket) and updates `menu.dishes.photo_url`.

Without `PHOTO_ADMIN_TOKEN` the admin route returns 404, so it's safe in production.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: photo pipeline quickstart"
```

---

## Task 14: End-to-end verification

No code changes — manual run through the spec's verification checklist.

- [ ] **Step 1: Stager smoke**

```bash
mkdir -p /tmp/photo-e2e
cp public/assets/*.png /tmp/photo-e2e/   # any small images
node scripts/menu/photos_stage.mjs /tmp/photo-e2e --out tmp/photos-staged
ls -la tmp/photos-staged/
cat tmp/photos-staged/_manifest.json | head -20
```
Expected: WebP files exist, manifest is well-formed JSON with `matched_dish_id: null` entries.

- [ ] **Step 2: Bucket exists**

Use Supabase MCP:
```sql
select id, name, public from storage.buckets where id = 'dishes';
```
Expected: one row, `public = true`.

- [ ] **Step 3: Picker page auth**

Without `PHOTO_ADMIN_TOKEN` set: `curl -sI http://localhost:3000/admin/photo-match | head -1` → `HTTP/1.1 404`.
With `PHOTO_ADMIN_TOKEN=secret`: `curl -sI 'http://localhost:3000/admin/photo-match?t=secret' | head -1` → `HTTP/1.1 200`.

- [ ] **Step 4: Apply flow against a real dish**

1. Pick one dish id from Supabase (e.g. `d1`).
2. In the picker, search for that dish, hit Enter on its row.
3. Verify network response is `200` with `public_url` in the body.
4. SQL check:
   ```sql
   select id, photo_url, photo_source, mock_status from menu.dishes where id = 'd1';
   ```
   Expected: `photo_url` populated with `https://sfzyqdpckgyznuhunygj.supabase.co/storage/v1/object/public/dishes/d1.webp?v=…`, `photo_source = 'menu_photo'`, `mock_status` recomputed (null if no other fields are `mockup`).
5. Open `http://localhost:3000/menu` (or the slug-gated URL) — the dish card shows the uploaded photo, not the `<ArchPlaceholder />`.

- [ ] **Step 5: Cache-bust on re-upload**

Re-run apply against the same dish with a different staged file → `?v=` portion of `photo_url` changes.

- [ ] **Step 6: Prod build guard**

```bash
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… npm run build
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… npm run start &
sleep 3
curl -sI http://localhost:3000/admin/photo-match | head -1
curl -sI -X POST http://localhost:3000/api/admin/photo-match/apply | head -1
kill %1
```
Both expected: `HTTP/1.1 404`.

---

## Self-review notes (to address before/during execution)

1. **`updateSql` doc block in Task 10** — explicitly deleted in Step 2; don't ship dead code.
2. **`readFileSyncIfExists` in Task 4** — replaced inline in Step 1 instructions; the require() trick won't work in ESM.
3. **`tsx` testing dep** — Task 5 adds it conditionally. If the project already has a test setup (none was found), prefer it. If `npm test` doesn't work for any reason, the `.ts` tests can be skipped (the JS test in Task 3 still runs via `node --test`).
4. **`runtime = 'nodejs'`** — explicitly set on both API routes because `node:fs` requires the Node runtime; default Edge would fail.
5. **Path traversal** — `basename()` is applied to user-supplied filenames in both routes; do not remove.
6. **Service-role key** — only present in `.env.local`, never committed, never set on Amvera. The apply route is the only consumer.
