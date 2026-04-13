import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { createTenantResolver } from '@/lib/tenant/resolver'
import { PUBLIC_ROUTES } from '@/lib/rbac/constants'

function setSecurityHeaders(res: NextResponse): void {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-DNS-Prefetch-Control', 'on')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

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

  // 5. Admin path guard: /admin/* requires is_platform_admin
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/auth/login'
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: userRow } = await adminClient
      .from('users')
      .select('is_platform_admin')
      .eq('id', user.id)
      .single()

    if (!userRow?.is_platform_admin) {
      const dashUrl = request.nextUrl.clone()
      dashUrl.pathname = '/onboarding'
      return NextResponse.redirect(dashUrl)
    }

    response.headers.set('Cache-Control', 'private, no-store')
    setSecurityHeaders(response)
    return response
  }

  // 6. Public routes bypass auth
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    route === '/' || route === '/docs'
      ? pathname === route || pathname === `${route}/`
      : pathname.startsWith(route)
  )

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 7. Redirect authenticated users away from login/signup to dashboard
  if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    const dashUrl = request.nextUrl.clone()
    dashUrl.pathname = '/onboarding'
    return NextResponse.redirect(dashUrl)
  }

  // 8. Forward resolved tenant slug to server components via header
  if (tenantSlug) {
    response.headers.set('x-tenant-slug', tenantSlug)
  }

  // 9. Prevent CDN/proxy caching of authenticated responses
  if (user) {
    response.headers.set('Cache-Control', 'private, no-store')
  }

  setSecurityHeaders(response)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
