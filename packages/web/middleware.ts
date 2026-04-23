import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { createTenantResolver } from '@/lib/tenant/resolver'
import { PUBLIC_ROUTES } from '@/lib/rbac/constants'
import { sanitizeRedirectPath } from '@/lib/auth/redirect'

function setSecurityHeaders(res: NextResponse): void {
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-DNS-Prefetch-Control', 'on')
  res.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  res.headers.set('Origin-Agent-Cluster', '?1')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

function buildNextParam(pathname: string, search: string): string {
  return sanitizeRedirectPath(`${pathname}${search}`)
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    route === '/' || route === '/docs'
      ? pathname === route || pathname === `${route}/`
      : pathname.startsWith(route)
  )
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // 1. Public routes: skip auth entirely for fast response
  if (isPublicRoute(pathname)) {
    let response = NextResponse.next({ request })

    // Still refresh session cookies if present (non-blocking for the user)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session if cookies exist (silent, non-blocking for page load)
    const hasCookies = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
    if (hasCookies) {
      const { data: { user } } = await supabase.auth.getUser()
      // Redirect authenticated users away from login/signup
      if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
        const redirectTo = sanitizeRedirectPath(request.nextUrl.searchParams.get('next'))
        const redirectUrl = new URL(redirectTo, request.url)
        const redirectResponse = NextResponse.redirect(redirectUrl)
        setSecurityHeaders(redirectResponse)
        redirectResponse.headers.set('Cache-Control', 'private, no-store')
        return redirectResponse
      }
    }

    setSecurityHeaders(response)
    return response
  }

  // 2. Resolve tenant BEFORE auth per architecture decision D-04
  const resolver = createTenantResolver()
  const tenantSlug = resolver.resolve(request)

  // 3. Build response object; may be replaced during cookie refresh
  let response = NextResponse.next({ request })

  // 4. Create Supabase SSR client - handles session cookie refresh
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
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 5. Validate session (getUser calls Supabase Auth API to verify JWT)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 6. Admin path guard: /admin/* requires is_platform_admin
  if (pathname.startsWith('/admin')) {
    if (!user) {
      if (isApiRoute(pathname)) {
        const apiResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        apiResponse.headers.set('Cache-Control', 'private, no-store')
        setSecurityHeaders(apiResponse)
        return apiResponse
      }

      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/auth/login'
      loginUrl.searchParams.set('next', buildNextParam(pathname, search))
      const redirectResponse = NextResponse.redirect(loginUrl)
      setSecurityHeaders(redirectResponse)
      redirectResponse.headers.set('Cache-Control', 'private, no-store')
      return redirectResponse
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
      const redirectResponse = NextResponse.redirect(dashUrl)
      setSecurityHeaders(redirectResponse)
      redirectResponse.headers.set('Cache-Control', 'private, no-store')
      return redirectResponse
    }

    response.headers.set('Cache-Control', 'private, no-store')
    setSecurityHeaders(response)
    return response
  }

  // 7. Redirect unauthenticated users to login
  if (!user) {
    if (isApiRoute(pathname)) {
      const apiResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      apiResponse.headers.set('Cache-Control', 'private, no-store')
      setSecurityHeaders(apiResponse)
      return apiResponse
    }

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('next', buildNextParam(pathname, search))
    const redirectResponse = NextResponse.redirect(loginUrl)
    setSecurityHeaders(redirectResponse)
    redirectResponse.headers.set('Cache-Control', 'private, no-store')
    return redirectResponse
  }

  // 8. Forward resolved tenant slug to server components via header
  if (tenantSlug) {
    response.headers.set('x-tenant-slug', tenantSlug)
  }

  // 9. Prevent CDN/proxy caching of authenticated responses
  response.headers.set('Cache-Control', 'private, no-store')

  setSecurityHeaders(response)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
