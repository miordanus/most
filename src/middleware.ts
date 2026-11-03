import { NextResponse, type NextRequest } from 'next/server'

const REALM = 'Basic realm="MOST menudq", charset="UTF-8"'

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function middleware(req: NextRequest) {
  const password = process.env.MENUDQ_PASSWORD
  if (!password) {
    if (process.env.NODE_ENV !== 'production') return NextResponse.next()
    return new NextResponse('menudq is locked: set MENUDQ_PASSWORD', { status: 503 })
  }

  const header = req.headers.get('authorization') ?? ''
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6))
      const given = decoded.slice(decoded.indexOf(':') + 1)
      if (safeEqual(given, password)) return NextResponse.next()
    } catch {}
  }
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': REALM },
  })
}

export const config = {
  matcher: ['/menudq', '/menudq/:path*'],
}
