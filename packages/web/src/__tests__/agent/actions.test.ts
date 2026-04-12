import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache before imports
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/rbac/checker', () => ({
  hasPermission: vi.fn(),
}))

import { createAgent, updateAgent, deleteAgent } from '@/lib/agent/actions'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { hasPermission } from '@/lib/rbac/checker'
import { revalidatePath } from 'next/cache'

const mockUser = { id: 'user-1', email: 'test@test.com' }
const tenantId = 'tenant-1'
const validFormData = {
  name: 'Test Agent',
  model_provider: 'openai',
  model_name: 'gpt-4o',
  temperature: 0.7,
  max_tokens: 4096,
  tools: [],
}

function buildMockSupabase(overrides: Record<string, unknown> = {}) {
  const insertResult = { data: { id: 'agent-1', ...validFormData }, error: null }
  const updateResult = { data: { id: 'agent-1', ...validFormData }, error: null }
  const deleteResult = { data: null, error: null }

  const chainable = (result: unknown) => {
    const chain: Record<string, unknown> = {}
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.select = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue(result)
    chain.then = undefined
    // For delete, resolve directly from eq
    const eqFn = vi.fn().mockReturnValue(chain)
    return { ...chain, eq: eqFn, resolve: result }
  }

  const insertChain = chainable(insertResult)
  const updateChain = chainable(updateResult)
  const deleteChain = chainable(deleteResult)

  // Make delete resolve from eq without needing single()
  deleteChain.eq = vi.fn().mockResolvedValue(deleteResult)

  const from = vi.fn().mockReturnValue({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(insertResult),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(updateResult),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(deleteResult),
      }),
    }),
  })

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: overrides.user !== undefined ? overrides.user : mockUser },
        error: null,
      }),
    },
    from,
  }
}

describe('createAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns agent on success with valid data and permission', async () => {
    const mockSb = buildMockSupabase()
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSb as any)
    vi.mocked(hasPermission).mockResolvedValue(true)

    const result = await createAgent(tenantId, validFormData)
    expect(result.error).toBeNull()
    expect(result.agent).toBeTruthy()
    expect(mockSb.from).toHaveBeenCalledWith('agents')
    expect(hasPermission).toHaveBeenCalledWith(mockSb, mockUser.id, tenantId, 'agent:create')
    expect(revalidatePath).toHaveBeenCalled()
  })

  it('returns error when not authenticated', async () => {
    const mockSb = buildMockSupabase({ user: null })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSb as any)

    const result = await createAgent(tenantId, validFormData)
    expect(result.agent).toBeNull()
    expect(result.error).toBe('Not authenticated')
  })

  it('returns error when missing agent:create permission', async () => {
    const mockSb = buildMockSupabase()
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSb as any)
    vi.mocked(hasPermission).mockResolvedValue(false)

    const result = await createAgent(tenantId, validFormData)
    expect(result.agent).toBeNull()
    expect(result.error).toBe('Forbidden')
  })
})

describe('updateAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates agent with valid data and permission', async () => {
    const mockSb = buildMockSupabase()
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSb as any)
    vi.mocked(hasPermission).mockResolvedValue(true)

    const result = await updateAgent(tenantId, 'agent-1', validFormData)
    expect(result.error).toBeNull()
    expect(result.agent).toBeTruthy()
    expect(hasPermission).toHaveBeenCalledWith(mockSb, mockUser.id, tenantId, 'agent:update')
  })
})

describe('deleteAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('checks agent:delete permission', async () => {
    const mockSb = buildMockSupabase()
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSb as any)
    vi.mocked(hasPermission).mockResolvedValue(true)

    const result = await deleteAgent(tenantId, 'agent-1')
    expect(result.error).toBeNull()
    expect(hasPermission).toHaveBeenCalledWith(mockSb, mockUser.id, tenantId, 'agent:delete')
  })
})
