import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { stagePhotos } from './photos_stage.mjs'

async function setupSourceDir() {
  const dir = mkdtempSync(join(tmpdir(), 'photos-src-'))
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
