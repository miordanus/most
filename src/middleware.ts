import { NextResponse, type NextRequest } from 'next/server'

const REALM = 'Basic realm="MOST menudq", charset="UTF-8"'

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function menudqAuth(req: NextRequest) {
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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const slug = process.env.MENU_GATE_SLUG
  if (slug) {
    if (pathname === `/${slug}`) {
      return NextResponse.rewrite(new URL('/menu', req.url))
    }
    if (pathname.startsWith(`/${slug}/`)) {
      const rest = pathname.slice(slug.length + 1)
      return NextResponse.rewrite(new URL(`/menu${rest}`, req.url))
    }
    return new NextResponse(null, { status: 404 })
  }

  if (pathname === '/menudq' || pathname.startsWith('/menudq/')) return menudqAuth(req)

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|robots.txt|assets/).*)'],
}
