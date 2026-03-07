import { NextResponse, type NextRequest } from 'next/server'

// middleware file convention is deprecated in Next.js; export a proxy function instead
export async function proxy(request: NextRequest) {
  return NextResponse.next({ request })
}

// for backwards compatibility with the middleware file name,
// also export `middleware` as an alias so Next.js can find it.
export const middleware = proxy

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
