import { describe, it, expect, vi } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({ auth: {} }),
}))

describe('createSupabaseServerClient', () => {
  it('calls createServerClient with env vars and cookie config', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
    const { createSupabaseServerClient } = await import('@/lib/auth/server')

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    await createSupabaseServerClient()

    expect(cookies).toHaveBeenCalled()
    expect(createServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    )
  })
})
