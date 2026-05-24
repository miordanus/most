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
}: {
  searchParams: { t?: string }
}) {
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
    supabaseServer
      .from('dishes')
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
