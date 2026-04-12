import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createTenantResolver } from '@/lib/tenant/resolver'
import { PUBLIC_ROUTES } from '@/lib/rbac/constants'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Resolve tenant BEFORE auth per architecture decision D-04
  const resolver = createTenantResolver()
  const tenantSlug = resolver.resolve(request)

  // 2. Build response object; may be replaced during cookie refresh
  let response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  })

  // 3. Create Supabase SSR client - handles session cookie refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: { headers: new Headers(request.headers) },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 4. Validate session (getUser calls Supabase Auth API to verify JWT)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 5. Public routes bypass auth
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 6. Redirect authenticated users away from login/signup to dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const dashUrl = request.nextUrl.clone()
    dashUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashUrl)
  }

  // 7. Forward resolved tenant slug to server components via header
  if (tenantSlug) {
    response.headers.set('x-tenant-slug', tenantSlug)
  }

  // 8. Prevent CDN/proxy caching of authenticated responses
  if (user) {
    response.headers.set('Cache-Control', 'private, no-store')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
