import { createClient } from '@supabase/supabase-js'

function build() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for admin routes')
  }
  return createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: 'menu' },
  })
}

let cached: ReturnType<typeof build> | null = null

export function supabaseService() {
  if (!cached) cached = build()
  return cached
}
