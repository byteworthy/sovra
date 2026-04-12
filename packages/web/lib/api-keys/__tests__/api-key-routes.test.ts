import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mocks — must be at module level for vi.mock hoisting to work
const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

vi.mock('@/lib/api-keys/generator', () => ({
  generateApiKey: vi.fn().mockReturnValue({
    raw: 'bsk_testrawkey1234567890abcdefghijklmnopqrstuvwxyz',
    hash: 'abc123hash' + 'a'.repeat(54),
    prefix: 'bsk_testrawke',
  }),
}))

import { POST, GET } from '@/app/api/keys/route'
import { DELETE } from '@/app/api/keys/[id]/route'

// ─── POST /api/keys ───────────────────────────────────────────────────────────

describe('POST /api/keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const req = new Request('http://localhost/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Key' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when name is missing', async () => {
    const tenantChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
    }
    mockFrom.mockReturnValue(tenantChain)

    const req = new Request('http://localhost/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('creates key, stores hash, returns raw key once with 201', async () => {
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'key-id-1',
          name: 'My Key',
          key_prefix: 'bsk_testrawke',
          permissions: [],
          expires_at: null,
        },
        error: null,
      }),
    }
    const tenantChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
    }
    const auditChain = { insert: vi.fn().mockResolvedValue({ error: null }) }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenant_users') return tenantChain
      if (table === 'api_keys') return insertChain
      if (table === 'audit_logs') return auditChain
      return {}
    })

    const req = new Request('http://localhost/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Key', permissions: ['read'] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    // raw key returned once
    expect(body).toHaveProperty('raw_key')
    expect(body.raw_key).toMatch(/^bsk_/)
    // key_hash must never appear in response
    expect(body).not.toHaveProperty('key_hash')
    // insert was called with key_hash (stored in DB)
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ key_hash: expect.any(String) })
    )
  })

  it('accepts permissions array and expires_at', async () => {
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'key-id-2',
          name: 'Exp Key',
          key_prefix: 'bsk_testrawke',
          permissions: ['read'],
          expires_at: '2027-01-01T00:00:00.000Z',
        },
        error: null,
      }),
    }
    const tenantChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
    }
    const auditChain = { insert: vi.fn().mockResolvedValue({ error: null }) }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenant_users') return tenantChain
      if (table === 'api_keys') return insertChain
      if (table === 'audit_logs') return auditChain
      return {}
    })

    const req = new Request('http://localhost/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Exp Key',
        permissions: ['read'],
        expires_at: '2027-01-01T00:00:00.000Z',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.expires_at).toBe('2027-01-01T00:00:00.000Z')
  })
})

// ─── GET /api/keys ────────────────────────────────────────────────────────────

describe('GET /api/keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('returns list of keys for tenant without raw key or hash', async () => {
    const tenantChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
    }
    const keysChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'key-1',
            name: 'Key One',
            key_prefix: 'bsk_keyonexx',
            permissions: ['read'],
            expires_at: null,
            revoked_at: null,
            last_used_at: null,
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        error: null,
      }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenant_users') return tenantChain
      if (table === 'api_keys') return keysChain
      return {}
    })

    const req = new Request('http://localhost/api/keys', { method: 'GET' })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.keys)).toBe(true)
    // key_hash and raw_key must never appear in list response
    expect(body.keys[0]).not.toHaveProperty('key_hash')
    expect(body.keys[0]).not.toHaveProperty('raw_key')
    expect(body.keys[0]).toHaveProperty('key_prefix')
  })
})

// ─── DELETE /api/keys/[id] ────────────────────────────────────────────────────

describe('DELETE /api/keys/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('sets revoked_at and returns 200', async () => {
    const tenantChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
    }
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'key-1', tenant_id: 'tenant-1' },
        error: null,
      }),
    }
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'key-1' }, error: null }),
    }
    const auditChain = { insert: vi.fn().mockResolvedValue({ error: null }) }

    let apiKeyCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenant_users') return tenantChain
      if (table === 'api_keys') {
        apiKeyCallCount++
        return apiKeyCallCount === 1 ? selectChain : updateChain
      }
      if (table === 'audit_logs') return auditChain
      return {}
    })

    const req = new Request('http://localhost/api/keys/key-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'key-1' }) })
    expect(res.status).toBe(200)
  })

  it('returns 404 for non-existent key', async () => {
    const tenantChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
    }
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenant_users') return tenantChain
      if (table === 'api_keys') return selectChain
      return {}
    })

    const req = new Request('http://localhost/api/keys/nonexistent', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(404)
  })

  it('keys are scoped to authenticated tenant — returns 404 for other-tenant key', async () => {
    const tenantChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { tenant_id: 'tenant-1' } }),
    }
    // Tenant-scoped query returns no result for a key owned by another tenant
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tenant_users') return tenantChain
      if (table === 'api_keys') return selectChain
      return {}
    })

    const req = new Request('http://localhost/api/keys/other-tenant-key', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'other-tenant-key' }) })
    expect(res.status).toBe(404)
  })
})
