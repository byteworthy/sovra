import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/headers - required for server actions in test
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

// Mock createSupabaseServerClient
const mockRpc = vi.fn()
const mockSingle = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockEq = vi.fn()
const mockFrom = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  }),
}))

function setupFromChain(responses: Record<string, { data: unknown; error: unknown }>) {
  mockFrom.mockImplementation((table: string) => {
    const resp = responses[table] ?? { data: null, error: null }
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(resp),
      maybeSingle: vi.fn().mockResolvedValue(resp),
      update: vi.fn().mockReturnThis(),
    }
    return chain
  })
}

describe('createTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when user not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    setupFromChain({})
    mockRpc.mockResolvedValue({ error: null })

    const { createTenant } = await import('@/lib/tenant/actions')
    const result = await createTenant({ name: 'Acme Corp', slug: 'acme' })
    expect(result.error).toBe('Not authenticated')
    expect(result.tenant).toBeNull()
  })

  it('inserts tenant and calls seed_tenant_roles RPC', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const tenantData = { id: 'tenant-uuid', slug: 'acme', name: 'Acme Corp' }

    // Setup per-call tracking
    const tenantChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: tenantData, error: null }),
    }
    const rolesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'owner-role-uuid' }, error: null }),
    }
    const tuChain = {
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }

    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenants') return tenantChain
      if (table === 'roles') return rolesChain
      if (table === 'tenant_users') return tuChain
      return {}
    })
    mockRpc.mockResolvedValue({ error: null })

    const { createTenant } = await import('@/lib/tenant/actions')
    const result = await createTenant({ name: 'Acme Corp', slug: 'acme' })

    expect(result.error).toBeNull()
    expect(result.tenant).toEqual(tenantData)
    expect(mockRpc).toHaveBeenCalledWith('seed_tenant_roles', { p_tenant_id: 'tenant-uuid' })
  })

  it('adds creator as owner after tenant creation', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    const tenantData = { id: 'tenant-uuid', slug: 'acme', name: 'Acme Corp' }

    const tuInsertFn = vi.fn().mockResolvedValue({ data: null, error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenants') return {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: tenantData, error: null }),
      }
      if (table === 'roles') return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'owner-role-uuid' }, error: null }),
      }
      if (table === 'tenant_users') return { insert: tuInsertFn }
      return {}
    })
    mockRpc.mockResolvedValue({ error: null })

    const { createTenant } = await import('@/lib/tenant/actions')
    await createTenant({ name: 'Acme Corp', slug: 'acme' })

    expect(tuInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'owner', user_id: 'user-1', tenant_id: 'tenant-uuid' })
    )
  })

  it('returns error when slug already exists (23505 unique violation)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockFrom.mockImplementation(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } }),
    }))
    mockRpc.mockResolvedValue({ error: null })

    const { createTenant } = await import('@/lib/tenant/actions')
    const result = await createTenant({ name: 'Acme Corp', slug: 'acme' })
    expect(result.error).toBe('Slug already taken')
    expect(result.tenant).toBeNull()
  })
})
