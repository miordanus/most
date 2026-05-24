import { NextRequest } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { checkPhotoAdminToken } from '@/app/admin/photo-match/_auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t')
  if (!checkPhotoAdminToken(token)) {
    return new Response('Not found', { status: 404 })
  }
  const file = req.nextUrl.searchParams.get('file')
  if (!file) return new Response('Bad request', { status: 400 })

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
