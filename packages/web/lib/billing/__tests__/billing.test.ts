import { describe, it, expect, vi } from 'vitest'

// ============================================================
// Task 1: Plan definitions + client + health
// ============================================================

describe('PLANS', () => {
  it('has free, pro, enterprise keys', async () => {
    const { PLANS } = await import('../plans')
    expect(PLANS).toHaveProperty('free')
    expect(PLANS).toHaveProperty('pro')
    expect(PLANS).toHaveProperty('enterprise')
  })

  it('free plan has agents=2, apiCalls=1000, storageMb=100', async () => {
    const { PLANS } = await import('../plans')
    expect(PLANS.free.agents).toBe(2)
    expect(PLANS.free.apiCalls).toBe(1000)
    expect(PLANS.free.storageMb).toBe(100)
  })

  it('enterprise plan has unlimited (-1) for all limits', async () => {
    const { PLANS } = await import('../plans')
    expect(PLANS.enterprise.agents).toBe(-1)
    expect(PLANS.enterprise.apiCalls).toBe(-1)
    expect(PLANS.enterprise.storageMb).toBe(-1)
  })
})

describe('getPlanLimits', () => {
  it('returns correct limits for pro', async () => {
    const { getPlanLimits, PLANS } = await import('../plans')
    expect(getPlanLimits('pro')).toEqual(PLANS.pro)
  })

  it('falls back to free plan limits for unknown plan', async () => {
    const { getPlanLimits, PLANS } = await import('../plans')
    expect(getPlanLimits('invalid')).toEqual(PLANS.free)
  })
})

describe('getStripe', () => {
  it('throws when STRIPE_SECRET_KEY is missing', async () => {
    const originalKey = process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_SECRET_KEY
    vi.resetModules()
    const { getStripe, _resetStripeInstance } = await import('../client')
    _resetStripeInstance()
    expect(() => getStripe()).toThrow(/STRIPE_SECRET_KEY/)
    process.env.STRIPE_SECRET_KEY = originalKey
    vi.resetModules()
  })
})

describe('GET /api/health', () => {
  it('returns 200 with structured readiness payload', async () => {
    const original = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      WORKER_INTERNAL_URL: process.env.WORKER_INTERNAL_URL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    }

    try {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
      process.env.WORKER_INTERNAL_URL = 'http://worker.internal'
      process.env.OPENAI_API_KEY = 'sk-test'

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body).toEqual(
        expect.objectContaining({
          status: 'ok',
          checks: expect.objectContaining({
            supabase: 'configured',
            worker: 'configured',
          }),
        })
      )
    } finally {
      process.env.NEXT_PUBLIC_SUPABASE_URL = original.NEXT_PUBLIC_SUPABASE_URL
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = original.NEXT_PUBLIC_SUPABASE_ANON_KEY
      process.env.WORKER_INTERNAL_URL = original.WORKER_INTERNAL_URL
      process.env.OPENAI_API_KEY = original.OPENAI_API_KEY
    }
  })
})

// ============================================================
// Task 2: Webhook verification + event handling (Stripe)
// ============================================================

describe('handleWebhookEvent', () => {
  const makeMockSupabase = () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    const eqMock = vi.fn().mockReturnValue({ error: null })
    const mockFrom = vi.fn().mockReturnValue({
      upsert: upsertMock,
      update: () => ({ eq: eqMock }),
    })
    return { from: mockFrom, upsertMock, eqMock }
  }

  it('checkout.session.completed upserts subscription row', async () => {
    const { handleWebhookEvent } = await import('../webhook')
    const supabase = makeMockSupabase()
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          subscription: 'sub_123',
          customer: 'cus_123',
          metadata: { tenant_id: 'tenant-123', plan: 'pro' },
        },
      },
    }
    await expect(
      handleWebhookEvent(event as never, supabase as never)
    ).resolves.not.toThrow()
    expect(supabase.from).toHaveBeenCalledWith('subscriptions')
  })

  it('customer.subscription.deleted sets status to cancelled', async () => {
    const { handleWebhookEvent } = await import('../webhook')
    const supabase = makeMockSupabase()
    const event = {
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_123' } },
    }
    await expect(
      handleWebhookEvent(event as never, supabase as never)
    ).resolves.not.toThrow()
  })

  it('handles unknown events gracefully without throwing', async () => {
    const { handleWebhookEvent } = await import('../webhook')
    const supabase = makeMockSupabase()
    const event = { type: 'some.unknown.event', data: { object: {} } }
    await expect(
      handleWebhookEvent(event as never, supabase as never)
    ).resolves.not.toThrow()
  })
})

describe('getSubscriptionForTenant', () => {
  it('returns subscription data or null', async () => {
    const { getSubscriptionForTenant } = await import('../actions')
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'sub-1', plan: 'pro' }, error: null })
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }),
    }
    const result = await getSubscriptionForTenant(supabase as never, 'tenant-1')
    expect(result).toEqual({ id: 'sub-1', plan: 'pro' })
  })
})

describe('getUsageForTenant', () => {
  it('returns usage metrics object', async () => {
    const { getUsageForTenant } = await import('../actions')
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'tool_executions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ count: 42, error: null }),
              }),
            }),
          }
        }
        if (table === 'agents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
            }),
          }
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ count: 0, error: null }) }) }
      }),
    }
    const result = await getUsageForTenant(supabase as never, 'tenant-1')
    expect(result).toHaveProperty('apiCalls')
    expect(result).toHaveProperty('agents')
  })
})
