import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const slug = process.env.MENU_GATE_SLUG
  if (!slug) return NextResponse.next()

  const { pathname } = req.nextUrl

  if (pathname === `/${slug}`) {
    const url = new URL('/menu', req.url)
    url.search = req.nextUrl.search
    return NextResponse.rewrite(url)
  }
  if (pathname.startsWith(`/${slug}/`)) {
    const rest = pathname.slice(slug.length + 1)
    const url = new URL(`/menu${rest}`, req.url)
    url.search = req.nextUrl.search
    return NextResponse.rewrite(url)
  }

  return new NextResponse(null, { status: 404 })
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|robots.txt|assets/).*)'],
}
