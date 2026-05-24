#!/usr/bin/env node
// Re-apply all matched photos from tmp/photos-staged/_manifest.json:
//   - center-crop to 3:2
//   - re-encode WebP at quality 90
//   - upload to Supabase Storage bucket `dishes` as <dish_id>.webp (upsert)
//   - update menu.dishes.photo_url / photo_source / mock_status
//
// Used after `photos_stage.mjs --force` to bump Storage versions to the new
// quality without manually re-clicking through the picker. Individual photos
// can still be re-cropped via the picker afterwards.
//
// Env required (loaded from .env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal() {
  if (!existsSync('.env.local')) return
  const raw = readFileSync('.env.local', 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) process.env[m[1]] ??= m[2]
  }
}
loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (check .env.local)')
  process.exit(1)
}

const STAGED_DIR = 'tmp/photos-staged'
const MANIFEST_PATH = join(STAGED_DIR, '_manifest.json')
const ASPECT_W = 3
const ASPECT_H = 2
const QUALITY = 90

function centerCrop3by2(srcW, srcH) {
  // Largest 3:2 rectangle that fits inside (srcW x srcH), centered.
  const srcRatio = srcW / srcH
  const target = ASPECT_W / ASPECT_H
  let cropW, cropH
  if (srcRatio > target) {
    // source wider than 3:2 → crop sides
    cropH = srcH
    cropW = Math.round(cropH * target)
  } else {
    // source taller than 3:2 → crop top/bottom
    cropW = srcW
    cropH = Math.round(cropW / target)
  }
  const left = Math.round((srcW - cropW) / 2)
  const top = Math.round((srcH - cropH) / 2)
  return { left, top, width: cropW, height: cropH }
}

async function main() {
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`manifest not found at ${MANIFEST_PATH}; run photos_stage.mjs first`)
    process.exit(1)
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  const matched = manifest.filter((e) => e.matched_dish_id)
  if (matched.length === 0) {
    console.log('no matched photos in manifest')
    return
  }
  console.log(`re-applying ${matched.length} matched photos at q=${QUALITY}, center-crop 3:2`)

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
    db: { schema: 'menu' },
  })

  let ok = 0
  let failed = 0
  for (const entry of matched) {
    const dishId = entry.matched_dish_id
    const stagedPath = join(STAGED_DIR, entry.staged)
    if (!existsSync(stagedPath)) {
      console.warn(`  skip ${entry.staged} → ${dishId}: staged file missing`)
      failed++
      continue
    }

    try {
      const stagedBuf = readFileSync(stagedPath)
      const meta = await sharp(stagedBuf).metadata()
      const srcW = meta.width ?? entry.w
      const srcH = meta.height ?? entry.h

      let crop
      let cropSource
      if (entry.crop && Number.isFinite(entry.crop.w) && Number.isFinite(entry.crop.h)) {
        // Clamp stored crop to source bounds (in case source was re-staged at a different size)
        const left = Math.max(0, Math.min(Math.round(entry.crop.x), srcW - 1))
        const top = Math.max(0, Math.min(Math.round(entry.crop.y), srcH - 1))
        crop = {
          left,
          top,
          width: Math.max(1, Math.min(Math.round(entry.crop.w), srcW - left)),
          height: Math.max(1, Math.min(Math.round(entry.crop.h), srcH - top)),
        }
        cropSource = 'stored'
      } else {
        crop = centerCrop3by2(srcW, srcH)
        cropSource = 'center'
      }
      const out = await sharp(stagedBuf).extract(crop).webp({ quality: QUALITY }).toBuffer()

      const objectKey = `${dishId}.webp`
      const up = await sb.storage.from('dishes').upload(objectKey, out, {
        upsert: true,
        contentType: 'image/webp',
        cacheControl: '31536000, immutable',
      })
      if (up.error) throw new Error(`storage: ${up.error.message}`)

      const v = createHash('sha1').update(out).digest('hex').slice(0, 6)
      const publicUrl = sb.storage.from('dishes').getPublicUrl(objectKey).data.publicUrl + `?v=${v}`

      // Recompute mock_status: clear only if no other field still mockup
      const sel = await sb.from('dishes')
        .select('name_source,short_source,description_source,ingredients_source,price_source,nutrition_source,mock_status')
        .eq('id', dishId)
        .maybeSingle()
      if (sel.error) throw new Error(`select: ${sel.error.message}`)
      if (!sel.data) throw new Error('dish not found')

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
        .eq('id', dishId)
      if (upd.error) throw new Error(`update: ${upd.error.message}`)

      console.log(`  ✓ ${entry.staged} → ${dishId} · crop:${cropSource} · ${crop.width}×${crop.height} · ${(out.length/1024).toFixed(0)} KB`)
      ok++
    } catch (e) {
      console.warn(`  ✗ ${entry.staged} → ${dishId}: ${e instanceof Error ? e.message : String(e)}`)
      failed++
    }
  }

  console.log(`\ndone: ${ok} ok, ${failed} failed`)
  if (ok > 0) {
    // Touch the manifest so its mtime reflects the re-apply (no content change needed —
    // matched_dish_id values were already set; we just refreshed Storage + DB).
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
