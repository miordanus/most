import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const slug = process.env.MENU_GATE_SLUG
  if (!slug) return NextResponse.next()

  const { pathname } = req.nextUrl

  if (pathname === `/${slug}`) {
    return NextResponse.rewrite(new URL('/menu', req.url))
  }
  if (pathname.startsWith(`/${slug}/`)) {
    const rest = pathname.slice(slug.length + 1)
    return NextResponse.rewrite(new URL(`/menu${rest}`, req.url))
  }

  return new NextResponse(null, { status: 404 })
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|robots.txt|assets/).*)'],
}
