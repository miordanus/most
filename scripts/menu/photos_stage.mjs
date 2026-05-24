#!/usr/bin/env node
import { readdirSync, mkdirSync, statSync, existsSync, writeFileSync, readFileSync } from 'node:fs'
import { join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic'])

export async function stagePhotos({ sourceDir, outDir, width = 1800, quality = 90, force = false }) {
  if (!existsSync(sourceDir)) throw new Error(`source dir not found: ${sourceDir}`)
  mkdirSync(outDir, { recursive: true })

  // Load existing manifest first so we can preserve matched_dish_id across re-stages
  const manifestPath = join(outDir, '_manifest.json')
  let existing = []
  if (existsSync(manifestPath)) {
    try { existing = JSON.parse(readFileSync(manifestPath, 'utf8')) } catch { existing = [] }
  }
  const existingByName = new Map(existing.map((e) => [e.staged, e]))

  const entries = readdirSync(sourceDir)
    .filter((f) => EXTENSIONS.has(extname(f).toLowerCase()))
    .sort()

  const processed = []
  const skipped = []

  for (const filename of entries) {
    const stagedName = basename(filename, extname(filename)) + '.webp'
    const outPath = join(outDir, stagedName)
    const inPath = join(sourceDir, filename)

    if (existsSync(outPath) && !force) {
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

    const prevMatch = existingByName.get(stagedName)?.matched_dish_id ?? null
    processed.push({
      staged: stagedName,
      source: filename,
      bytes_in: bytesIn,
      bytes_out: buf.data.length,
      w: buf.info.width,
      h: buf.info.height,
      matched_dish_id: prevMatch,
    })
  }

  for (const p of processed) existingByName.set(p.staged, p)
  const manifest = Array.from(existingByName.values()).sort((a, b) => a.staged.localeCompare(b.staged))
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  return { processed, skipped, manifest }
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0 || args[0].startsWith('-')) {
    console.error('usage: node scripts/menu/photos_stage.mjs <source_dir> [--out tmp/photos-staged] [--width 1800] [--quality 90] [--force]')
    process.exit(1)
  }
  const sourceDir = args[0]
  const opts = { sourceDir, outDir: 'tmp/photos-staged', width: 1800, quality: 90, force: false }
  for (let i = 1; i < args.length; i++) {
    const k = args[i].replace(/^--/, '')
    if (k === 'force') { opts.force = true; continue }
    const v = args[++i]
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
