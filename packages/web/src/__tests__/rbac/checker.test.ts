import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SupabasePermissionChecker, hasPermission } from '@/lib/rbac/checker'

function makeQueryChain(returnValue: { data: unknown; error: unknown }) {
  const chain = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(returnValue),
    select: vi.fn(),
  }
  chain.eq.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  return chain
}

function createMockSupabase(returnValue: { data: unknown; error: unknown }) {
  const chain = makeQueryChain(returnValue)
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  }
}

describe('SupabasePermissionChecker', () => {
  it('implements PermissionChecker interface', () => {
    const supabase = createMockSupabase({ data: null, error: null })
    const checker = new SupabasePermissionChecker(supabase as never)
    expect(typeof checker.hasPermission).toBe('function')
  })

  it('hasPermission returns true when user has required permission via role', async () => {
    const supabase = createMockSupabase({
      data: { role_id: 'role-uuid', roles: { role_permissions: [{ permissions: { action: 'agent:read' } }] } },
      error: null,
    })
    const checker = new SupabasePermissionChecker(supabase as never)
    const result = await checker.hasPermission('user-1', 'tenant-1', 'agent:read')
    expect(result).toBe(true)
  })

  it('hasPermission returns false when user lacks the permission', async () => {
    const supabase = createMockSupabase({ data: null, error: null })
    const checker = new SupabasePermissionChecker(supabase as never)
    const result = await checker.hasPermission('user-1', 'tenant-1', 'tenant:manage')
    expect(result).toBe(false)
  })

  it('hasPermission returns false when user is not a member of the tenant', async () => {
    const supabase = createMockSupabase({ data: null, error: null })
    const checker = new SupabasePermissionChecker(supabase as never)
    const result = await checker.hasPermission('user-unknown', 'tenant-1', 'agent:read')
    expect(result).toBe(false)
  })

  it('hasPermission returns false on DB error', async () => {
    const supabase = createMockSupabase({ data: null, error: { message: 'DB error', code: '42P01' } })
    const checker = new SupabasePermissionChecker(supabase as never)
    const result = await checker.hasPermission('user-1', 'tenant-1', 'agent:read')
    expect(result).toBe(false)
  })

  it('queries tenant_users table', async () => {
    const supabase = createMockSupabase({ data: null, error: null })
    const checker = new SupabasePermissionChecker(supabase as never)
    await checker.hasPermission('user-1', 'tenant-1', 'agent:read')
    expect(supabase.from).toHaveBeenCalledWith('tenant_users')
  })
})

describe('hasPermission (standalone function)', () => {
  it('delegates to SupabasePermissionChecker and returns boolean', async () => {
    const supabase = createMockSupabase({
      data: { role_id: 'role-uuid' },
      error: null,
    })
    const result = await hasPermission(supabase as never, 'user-1', 'tenant-1', 'agent:read')
    expect(typeof result).toBe('boolean')
    expect(result).toBe(true)
  })
})
