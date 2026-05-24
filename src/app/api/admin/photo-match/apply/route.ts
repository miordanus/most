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
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const safeFile = basename(body.staged_filename || '')
  if (!safeFile.endsWith('.webp')) {
    return NextResponse.json({ error: 'staged_filename must be .webp' }, { status: 400 })
  }
  if (!body.dish_id || typeof body.dish_id !== 'string') {
    return NextResponse.json({ error: 'dish_id required' }, { status: 400 })
  }

  const stagedRoot = join(process.cwd(), 'tmp/photos-staged')
  const stagedPath = join(stagedRoot, safeFile)
  let buf: Buffer
  try {
    buf = await readFile(stagedPath)
  } catch {
    return NextResponse.json({ error: 'staged file not found' }, { status: 404 })
  }

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

  const v = createHash('sha1').update(buf).digest('hex').slice(0, 6)
  const publicUrl = sb.storage.from('dishes').getPublicUrl(objectKey).data.publicUrl + `?v=${v}`

  const sel = await sb
    .from('dishes')
    .select('name_source,short_source,description_source,ingredients_source,price_source,nutrition_source,mock_status')
    .eq('id', body.dish_id)
    .maybeSingle()
  if (sel.error) {
    return NextResponse.json({ error: `select failed: ${sel.error.message}` }, { status: 500 })
  }
  if (!sel.data) {
    return NextResponse.json({ error: 'dish not found' }, { status: 404 })
  }

  const stillMocked =
    sel.data.name_source === 'mockup' ||
    (sel.data.short_source ?? '') === 'mockup' ||
    sel.data.description_source === 'mockup' ||
    sel.data.ingredients_source === 'mockup' ||
    sel.data.price_source === 'mockup' ||
    sel.data.nutrition_source === 'mockup'

  const upd = await sb
    .from('dishes')
    .update({
      photo_url: publicUrl,
      photo_source: 'menu_photo',
      mock_status: stillMocked ? sel.data.mock_status : null,
    })
    .eq('id', body.dish_id)
    .select('id, photo_url, photo_source, mock_status')
    .maybeSingle()
  if (upd.error) {
    return NextResponse.json({ error: `update failed: ${upd.error.message}` }, { status: 500 })
  }

  const manifestPath = join(stagedRoot, '_manifest.json')
  try {
    const raw = await readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(raw) as Array<Record<string, unknown>>
    for (const e of manifest) {
      if (e.staged === safeFile) e.matched_dish_id = body.dish_id
    }
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  } catch {
    console.warn('failed to update manifest for', safeFile)
  }

  revalidatePath('/menu')

  return NextResponse.json({ ok: true, public_url: publicUrl, row: upd.data })
}
