import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Generator tests ─────────────────────────────────────────────────────────

describe('generateApiKey', () => {
  it('returns raw key starting with bsk_', async () => {
    const { generateApiKey } = await import('../generator')
    const result = generateApiKey()
    expect(result.raw).toMatch(/^bsk_/)
  })

  it('returns hash as 64 char hex string', async () => {
    const { generateApiKey } = await import('../generator')
    const result = generateApiKey()
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns prefix as 12 chars', async () => {
    const { generateApiKey } = await import('../generator')
    const result = generateApiKey()
    expect(result.prefix).toHaveLength(12)
    expect(result.prefix).toBe(result.raw.slice(0, 12))
  })

  it('produces unique keys on successive calls', async () => {
    const { generateApiKey } = await import('../generator')
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a.raw).not.toBe(b.raw)
    expect(a.hash).not.toBe(b.hash)
  })

  it('raw key base64url decoded section is 32 bytes', async () => {
    const { generateApiKey } = await import('../generator')
    const result = generateApiKey()
    // raw = 'bsk_' + base64url(32 bytes); base64url(32 bytes) = 43 chars
    const encodedPart = result.raw.slice('bsk_'.length)
    const decoded = Buffer.from(encodedPart, 'base64url')
    expect(decoded.byteLength).toBe(32)
  })
})

// ─── Authenticator tests ──────────────────────────────────────────────────────

function makeSupabaseForAuth(
  row: Record<string, unknown> | null,
  error: unknown = null
) {
  const updateChain = {
    eq: vi.fn().mockResolvedValue({ error: null }),
  }

  const chain = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: row, error }),
    update: vi.fn().mockReturnValue(updateChain),
  }

  return { from: vi.fn().mockReturnValue(chain), chain, updateChain }
}

describe('authenticateApiKey', () => {
  it('returns { valid: false } for key not starting with bsk_', async () => {
    const { authenticateApiKey } = await import('../authenticator')
    const supabase = { from: vi.fn() } as unknown as Parameters<typeof authenticateApiKey>[0]
    const result = await authenticateApiKey(supabase, 'invalid-key')
    expect(result).toEqual({ valid: false })
  })

  it('returns { valid: false } for key not found in DB', async () => {
    const { authenticateApiKey } = await import('../authenticator')
    const { from } = makeSupabaseForAuth(null, { message: 'not found' })
    const result = await authenticateApiKey(
      { from } as unknown as Parameters<typeof authenticateApiKey>[0],
      'bsk_notfoundkeyabcdefghijklmnopqrstuvwxyz12345678'
    )
    expect(result).toEqual({ valid: false })
  })

  it('returns { valid: false } for expired key (expires_at in past)', async () => {
    const { authenticateApiKey } = await import('../authenticator')
    const expiredRow = {
      id: 'key-1',
      tenant_id: 'tenant-1',
      permissions: ['read'],
      expires_at: new Date(Date.now() - 1000).toISOString(),
      revoked_at: null,
    }
    const { from } = makeSupabaseForAuth(expiredRow)
    const result = await authenticateApiKey(
      { from } as unknown as Parameters<typeof authenticateApiKey>[0],
      'bsk_expiredkeyabcdefghijklmnopqrstuvwxyz1234567'
    )
    expect(result).toEqual({ valid: false })
  })

  it('returns { valid: false } for revoked key (revoked_at not null)', async () => {
    const { authenticateApiKey } = await import('../authenticator')
    const revokedRow = {
      id: 'key-2',
      tenant_id: 'tenant-1',
      permissions: ['read'],
      expires_at: null,
      revoked_at: new Date().toISOString(),
    }
    const { from } = makeSupabaseForAuth(revokedRow)
    const result = await authenticateApiKey(
      { from } as unknown as Parameters<typeof authenticateApiKey>[0],
      'bsk_revokedkeyabcdefghijklmnopqrstuvwxyz123456'
    )
    expect(result).toEqual({ valid: false })
  })

  it('returns { valid: true, tenantId, permissions } for valid key', async () => {
    const { generateApiKey } = await import('../generator')
    const { authenticateApiKey } = await import('../authenticator')

    const generated = generateApiKey()
    const validRow = {
      id: 'key-3',
      tenant_id: 'tenant-1',
      permissions: ['read', 'write'],
      expires_at: null,
      revoked_at: null,
    }

    const { from } = makeSupabaseForAuth(validRow)
    const result = await authenticateApiKey(
      { from } as unknown as Parameters<typeof authenticateApiKey>[0],
      generated.raw
    )
    expect(result).toEqual({ valid: true, tenantId: 'tenant-1', permissions: ['read', 'write'] })
  })

  it('updates last_used_at asynchronously on valid auth', async () => {
    const { generateApiKey } = await import('../generator')
    const { authenticateApiKey } = await import('../authenticator')

    const generated = generateApiKey()
    const validRow = {
      id: 'key-4',
      tenant_id: 'tenant-1',
      permissions: [],
      expires_at: null,
      revoked_at: null,
    }

    const eqSpy = vi.fn().mockResolvedValue({ error: null })
    const updateChain = { eq: eqSpy }
    const updateSpy = vi.fn().mockReturnValue(updateChain)

    const chain = {
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: validRow, error: null }),
      update: updateSpy,
    }

    const supabase = { from: vi.fn().mockReturnValue(chain) } as unknown as Parameters<typeof authenticateApiKey>[0]

    await authenticateApiKey(supabase, generated.raw)

    // Allow fire-and-forget microtask to run
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ last_used_at: expect.any(String) })
    )
  })
})

// ─── Rate limiter tests ───────────────────────────────────────────────────────

describe('getRateLimiter', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('returns null when UPSTASH_REDIS_REST_URL is not set', async () => {
    const { getRateLimiter } = await import('../rate-limiter')
    const limiter = getRateLimiter()
    expect(limiter).toBeNull()
  })

  it('returns Ratelimit instance when env vars are set', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.doMock('@upstash/redis', () => ({ Redis: function FakeRedis(this: any) { return this } }))
    vi.doMock('@upstash/ratelimit', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function MockRatelimit(this: any) { this.limit = vi.fn() }
      MockRatelimit.slidingWindow = vi.fn().mockReturnValue({})
      return { Ratelimit: MockRatelimit }
    })

    const { getRateLimiter } = await import('../rate-limiter')
    const limiter = getRateLimiter()
    expect(limiter).not.toBeNull()
  })
})

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('returns { success: true } when no rate limiter configured (graceful fallback)', async () => {
    const { checkRateLimit } = await import('../rate-limiter')
    const result = await checkRateLimit('test-identifier')
    expect(result).toEqual({ success: true })
  })

  it('returns { success: false, reset } when limit exceeded (mock Ratelimit)', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'

    const mockLimit = vi.fn().mockResolvedValue({ success: false, reset: 1700000000000 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.doMock('@upstash/redis', () => ({ Redis: function FakeRedis(this: any) { return this } }))
    vi.doMock('@upstash/ratelimit', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function MockRatelimit(this: any) { this.limit = mockLimit }
      MockRatelimit.slidingWindow = vi.fn().mockReturnValue({})
      return { Ratelimit: MockRatelimit }
    })

    const { checkRateLimit } = await import('../rate-limiter')
    const result = await checkRateLimit('test-identifier')
    expect(result.success).toBe(false)
    expect(result.reset).toBeDefined()
  })
})

// ─── Middleware tests ─────────────────────────────────────────────────────────

describe('withApiKeyAuth', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it('returns 401 when no Authorization header', async () => {
    const { withApiKeyAuth } = await import('../middleware')
    const handler = vi.fn()
    // Pass a no-op supabase factory so no real client is created
    const fakeSupabase = { from: vi.fn() } as unknown as Parameters<typeof withApiKeyAuth>[1] extends (() => infer R) ? () => R : never
    const wrapped = withApiKeyAuth(handler, () => ({ from: vi.fn() }) as never)

    const request = new Request('https://example.com/api/test', { method: 'GET' })

    const response = await wrapped(request)
    expect(response.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it('extracts Bearer token and calls authenticateApiKey', async () => {
    vi.doMock('../authenticator', () => ({
      authenticateApiKey: vi.fn().mockResolvedValue({ valid: true, tenantId: 't1', permissions: [] }),
    }))
    vi.doMock('../rate-limiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
    }))

    const { withApiKeyAuth } = await import('../middleware')
    const handler = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    const wrapped = withApiKeyAuth(handler, () => ({ from: vi.fn() }) as never)

    const request = new Request('https://example.com/api/test', {
      method: 'GET',
      headers: { Authorization: 'Bearer bsk_testkey12345' },
    })

    const response = await wrapped(request)
    expect(response.status).toBe(200)
    expect(handler).toHaveBeenCalled()
  })

  it('returns 429 when rate limited', async () => {
    vi.doMock('../authenticator', () => ({
      authenticateApiKey: vi.fn().mockResolvedValue({ valid: true, tenantId: 't1', permissions: [] }),
    }))
    vi.doMock('../rate-limiter', () => ({
      checkRateLimit: vi.fn().mockResolvedValue({ success: false, reset: 1700000000000 }),
    }))

    const { withApiKeyAuth } = await import('../middleware')
    const handler = vi.fn()
    const wrapped = withApiKeyAuth(handler, () => ({ from: vi.fn() }) as never)

    const request = new Request('https://example.com/api/test', {
      method: 'GET',
      headers: { Authorization: 'Bearer bsk_testkey12345' },
    })

    const response = await wrapped(request)
    expect(response.status).toBe(429)
    expect(handler).not.toHaveBeenCalled()
  })
})
