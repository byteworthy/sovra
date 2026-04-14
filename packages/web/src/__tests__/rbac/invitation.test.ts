import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

vi.mock('@/lib/rbac/checker', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

// Mock admin client used by acceptInvitation
const mockAdminFrom = vi.fn()
const mockAdminRpc = vi.fn()

vi.mock('@/lib/admin/service-client', () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: mockAdminFrom,
    rpc: mockAdminRpc,
  }),
}))

// We mock the crypto module to get deterministic tokens
vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto')
  return {
    ...actual,
    randomBytes: vi.fn().mockReturnValue({ toString: () => 'deadbeef'.repeat(8) }),
  }
})

describe('createInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const { createInvitation } = await import('@/lib/rbac/invitation')
    const result = await createInvitation({
      tenantId: 'tenant-1',
      roleId: 'role-1',
      inviteType: 'email',
      email: 'user@example.com',
    })
    expect(result.error).toBe('Not authenticated')
    expect(result.invitation).toBeNull()
  })

  it('creates pending invitation with secure random token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    const inviteData = {
      id: 'inv-uuid',
      tenant_id: 'tenant-1',
      email: 'user@example.com',
      role_id: 'role-1',
      token: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      invite_type: 'email',
      status: 'pending',
      max_uses: 1,
      use_count: 0,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      created_by: 'admin-1',
      created_at: new Date().toISOString(),
    }

    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: inviteData, error: null }),
    })

    const { createInvitation } = await import('@/lib/rbac/invitation')
    const result = await createInvitation({
      tenantId: 'tenant-1',
      roleId: 'role-1',
      inviteType: 'email',
      email: 'user@example.com',
    })
    expect(result.error).toBeNull()
    expect(result.invitation).not.toBeNull()
    expect(result.invitation?.inviteType).toBe('email')
    expect(result.invitation?.status).toBe('pending')
  })

  it('sets expires_at to 7 days from now by default', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })

    const insertPayloadCapture: unknown[] = []
    mockFrom.mockReturnValue({
      insert: vi.fn().mockImplementation((payload: unknown) => {
        insertPayloadCapture.push(payload)
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'inv-1', tenant_id: 'tenant-1', email: null, role_id: 'role-1',
              token: 'abc', invite_type: 'link', status: 'pending', max_uses: null,
              use_count: 0, expires_at: new Date().toISOString(), created_by: 'admin-1', created_at: new Date().toISOString()
            },
            error: null,
          }),
        }
      }),
    })

    const { createInvitation } = await import('@/lib/rbac/invitation')
    await createInvitation({ tenantId: 'tenant-1', roleId: 'role-1', inviteType: 'link' })

    const payload = insertPayloadCapture[0] as Record<string, unknown>
    const expiresAt = new Date(payload.expires_at as string)
    const nowPlus7 = new Date()
    nowPlus7.setDate(nowPlus7.getDate() + 7)
    // Within 1 minute of expected expiry
    expect(Math.abs(expiresAt.getTime() - nowPlus7.getTime())).toBeLessThan(60000)
  })
})

describe('createInviteLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('creates invitation with invite_type link', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })

    const insertPayloadCapture: unknown[] = []
    mockFrom.mockReturnValue({
      insert: vi.fn().mockImplementation((payload: unknown) => {
        insertPayloadCapture.push(payload)
        return {
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'inv-1', tenant_id: 'tenant-1', email: null, role_id: 'role-1',
              token: 'abc', invite_type: 'link', status: 'pending', max_uses: 5,
              use_count: 0, expires_at: new Date().toISOString(), created_by: 'admin-1', created_at: new Date().toISOString()
            },
            error: null,
          }),
        }
      }),
    })

    const { createInviteLink } = await import('@/lib/rbac/invitation')
    const result = await createInviteLink('tenant-1', 'role-1', 5)

    expect(result.error).toBeNull()
    const payload = insertPayloadCapture[0] as Record<string, unknown>
    expect(payload.invite_type).toBe('link')
    expect(payload.max_uses).toBe(5)
  })
})

describe('acceptInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    const { acceptInvitation } = await import('@/lib/rbac/invitation')
    const result = await acceptInvitation('some-token')
    expect(result.error).toBe('Not authenticated')
    expect(result.tenantId).toBeNull()
  })

  it('rejects expired invitations', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const expiredDate = new Date(Date.now() - 1000).toISOString()

    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'inv-1', tenant_id: 'tenant-1', role_id: 'role-1',
          token: 'valid-token', invite_type: 'email', status: 'pending',
          max_uses: 1, use_count: 0, expires_at: expiredDate,
        },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    })

    const { acceptInvitation } = await import('@/lib/rbac/invitation')
    const result = await acceptInvitation('valid-token')
    expect(result.error).toBe('Invitation has expired')
    expect(result.tenantId).toBeNull()
  })

  it('rejects invitations via atomic check when max_uses exceeded', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const futureDate = new Date(Date.now() + 86400000).toISOString()

    mockAdminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'inv-1', tenant_id: 'tenant-1', role_id: 'role-1',
          token: 'link-token', invite_type: 'link', status: 'pending',
          max_uses: 5, use_count: 4, expires_at: futureDate,
        },
        error: null,
      }),
    })
    // Atomic RPC returns false (max_uses reached)
    mockAdminRpc.mockResolvedValue({ data: false, error: null })

    const { acceptInvitation } = await import('@/lib/rbac/invitation')
    const result = await acceptInvitation('link-token')
    expect(result.error).toBe('Invitation is no longer valid')
  })

  it('adds user to tenant and returns tenantId on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const futureDate = new Date(Date.now() + 86400000).toISOString()
    const inviteRow = {
      id: 'inv-1', tenant_id: 'tenant-1', role_id: 'role-1',
      token: 'good-token', invite_type: 'email', status: 'pending',
      max_uses: 1, use_count: 0, expires_at: futureDate,
    }

    const tuInsertFn = vi.fn().mockResolvedValue({ data: null, error: null })
    const updateEq = vi.fn().mockResolvedValue({ data: null, error: null })

    // Atomic RPC returns true (invitation claimed)
    mockAdminRpc.mockResolvedValue({ data: true, error: null })

    let adminFromCallCount = 0
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'invitations') {
        adminFromCallCount++
        if (adminFromCallCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: inviteRow, error: null }),
          }
        }
        return { update: vi.fn().mockReturnThis(), eq: updateEq }
      }
      if (table === 'roles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { name: 'member' }, error: null }),
        }
      }
      if (table === 'tenant_users') {
        return { insert: tuInsertFn }
      }
      return {}
    })

    const { acceptInvitation } = await import('@/lib/rbac/invitation')
    const result = await acceptInvitation('good-token')

    expect(result.error).toBeNull()
    expect(result.tenantId).toBe('tenant-1')
    expect(tuInsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 'tenant-1', user_id: 'user-1' })
    )
  })
})
