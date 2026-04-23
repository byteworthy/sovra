import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock next/server
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      next: vi.fn().mockImplementation(({ request: _request } = {}) => {
        const response = {
          headers: new Map<string, string>(),
          cookies: { set: vi.fn(), getAll: vi.fn().mockReturnValue([]) },
          status: 200,
        }
        response.headers.set = response.headers.set.bind(response.headers)
        response.headers.get = response.headers.get.bind(response.headers)
        return response
      }),
      redirect: vi.fn().mockImplementation((url: URL | string) => ({
        headers: new Map<string, string>(),
        cookies: { set: vi.fn() },
        status: 307,
        redirected: true,
        redirectUrl: url.toString(),
      })),
      json: vi.fn().mockImplementation(
        (
          body: unknown,
          init: { status?: number } = {}
        ) => ({
          headers: new Map<string, string>(),
          cookies: { set: vi.fn() },
          status: init.status ?? 200,
          body,
        })
      ),
    },
  }
})

// Mock @supabase/ssr
const mockGetUser = vi.fn()
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _mockGetAll = vi.fn().mockReturnValue([])
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _mockSetAll = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

// Mock tenant resolver
const mockResolve = vi.fn().mockReturnValue(null)
vi.mock('@/lib/tenant/resolver', () => ({
  createTenantResolver: vi.fn().mockReturnValue({
    resolve: mockResolve,
  }),
}))

// Mock constants
vi.mock('@/lib/rbac/constants', () => ({
  PUBLIC_ROUTES: ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email', '/auth/callback', '/invite'],
  TENANT_FREE_ROUTES: ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password', '/auth/verify-email', '/auth/callback', '/invite', '/onboarding'],
}))

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function makeRequest(pathname: string, _headers: Record<string, string> = {}) {
  const url = `http://localhost${pathname}`
  const req = new NextRequest(url)
  return req
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolve.mockReturnValue(null)
    // Default: no user
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
  })

  it('passes through static asset requests without auth check', async () => {
    const { middleware } = await import('@/middleware')
    const req = makeRequest('/_next/static/chunk.js')
    // Static assets match the exclusion pattern in config.matcher, not middleware itself
    // But if they do reach middleware, they should not be redirected
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const response = await middleware(req)
    // Should not redirect
    expect(response).toBeDefined()
  })

  it('allows public routes without authentication', async () => {
    const { middleware } = await import('@/middleware')
    const req = makeRequest('/auth/login')
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const response = await middleware(req) as unknown as { status?: number; redirectUrl?: string }
    // Should NOT redirect (it's already a public route)
    expect(response.redirectUrl).toBeUndefined()
  })

  it('redirects unauthenticated users on protected routes to /auth/login', async () => {
    const { middleware } = await import('@/middleware')
    const req = makeRequest('/t/acme/dashboard')
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const response = await middleware(req) as unknown as { redirectUrl?: string; status?: number }
    expect(response.redirectUrl).toContain('/auth/login')
  })

  it('resolves tenant slug and sets x-tenant-slug header', async () => {
    const { middleware } = await import('@/middleware')
    const req = makeRequest('/t/acme/dashboard')
    mockResolve.mockReturnValue('acme')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const response = await middleware(req) as unknown as { headers: Map<string, string> }
    expect(response.headers.get('x-tenant-slug')).toBe('acme')
  })

  it('sets Cache-Control: private, no-store on authenticated responses', async () => {
    const { middleware } = await import('@/middleware')
    const req = makeRequest('/dashboard')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const response = await middleware(req) as unknown as { headers: Map<string, string> }
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('returns JSON 401 for unauthenticated API routes', async () => {
    const { middleware } = await import('@/middleware')
    const req = makeRequest('/api/documents/search')
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const response = await middleware(req) as unknown as {
      status: number
      body: { error: string }
      headers: Map<string, string>
      redirectUrl?: string
    }

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Unauthorized' })
    expect(response.redirectUrl).toBeUndefined()
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('redirects authenticated users on /auth/login to /onboarding', async () => {
    const { middleware } = await import('@/middleware')
    const req = makeRequest('/auth/login')
    // Simulate existing session cookie so middleware checks auth on public route
    req.cookies.set('sb-localhost-auth-token', 'fake-session')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const response = await middleware(req) as unknown as { redirectUrl?: string }
    expect(response.redirectUrl).toContain('/onboarding')
  })

  it('redirects authenticated users on /auth/login to sanitized next path', async () => {
    const { middleware } = await import('@/middleware')
    const req = makeRequest('/auth/login?next=/t/acme/dashboard')
    req.cookies.set('sb-localhost-auth-token', 'fake-session')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const response = await middleware(req) as unknown as { redirectUrl?: string }
    expect(response.redirectUrl).toContain('/t/acme/dashboard')
  })

  it('sanitizes invalid next path for authenticated /auth/login redirects', async () => {
    const { middleware } = await import('@/middleware')
    const req = makeRequest('/auth/login?next=https://evil.example')
    req.cookies.set('sb-localhost-auth-token', 'fake-session')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const response = await middleware(req) as unknown as { redirectUrl?: string }
    expect(response.redirectUrl).toContain('/onboarding')
  })

  it('middleware config exports matcher array', async () => {
    const { config } = await import('@/middleware')
    expect(Array.isArray(config.matcher)).toBe(true)
    expect(config.matcher.length).toBeGreaterThan(0)
  })
})
