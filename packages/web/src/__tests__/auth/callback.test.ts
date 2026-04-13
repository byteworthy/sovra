import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockExchangeCodeForSession = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  }),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url: string | URL) => ({ url: url.toString(), status: 302 })),
  },
}))

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExchangeCodeForSession.mockResolvedValue({ error: null })
  })

  it('exchanges code and redirects to /onboarding by default', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const { NextResponse } = await import('next/server')

    const request = new Request('https://example.com/auth/callback?code=abc123')
    await GET(request)

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123')
    expect(NextResponse.redirect).toHaveBeenCalledWith('https://example.com/onboarding')
  })

  it('redirects to /next param when provided', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const { NextResponse } = await import('next/server')

    const request = new Request('https://example.com/auth/callback?code=abc123&next=/t/acme/settings')
    await GET(request)

    expect(NextResponse.redirect).toHaveBeenCalledWith('https://example.com/t/acme/settings')
  })

  it('redirects to /auth/reset-password when type=recovery', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const { NextResponse } = await import('next/server')

    const request = new Request('https://example.com/auth/callback?code=abc123&type=recovery')
    await GET(request)

    expect(NextResponse.redirect).toHaveBeenCalledWith('https://example.com/auth/reset-password')
  })

  it('redirects to /auth/login with error when error param is present', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const { NextResponse } = await import('next/server')

    const request = new Request('https://example.com/auth/callback?error=access_denied')
    await GET(request)

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      'https://example.com/auth/login?error=access_denied'
    )
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('redirects to /auth/login when no code and no error', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const { NextResponse } = await import('next/server')

    const request = new Request('https://example.com/auth/callback')
    await GET(request)

    expect(NextResponse.redirect).toHaveBeenCalledWith('https://example.com/auth/login')
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('sanitizes next param to prevent open redirect with double-slash', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const { NextResponse } = await import('next/server')

    const request = new Request('https://example.com/auth/callback?code=abc123&next=//evil.com')
    await GET(request)

    expect(NextResponse.redirect).toHaveBeenCalledWith('https://example.com/onboarding')
  })

  it('sanitizes next param to prevent open redirect with protocol', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const { NextResponse } = await import('next/server')

    const request = new Request('https://example.com/auth/callback?code=abc123&next=https://evil.com')
    await GET(request)

    expect(NextResponse.redirect).toHaveBeenCalledWith('https://example.com/onboarding')
  })

  it('allows valid relative next paths', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const { NextResponse } = await import('next/server')

    const request = new Request('https://example.com/auth/callback?code=abc123&next=/t/acme/agents')
    await GET(request)

    expect(NextResponse.redirect).toHaveBeenCalledWith('https://example.com/t/acme/agents')
  })
})
