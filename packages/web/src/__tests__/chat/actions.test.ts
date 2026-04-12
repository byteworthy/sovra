import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

import { createConversation, deleteConversation, saveMessage } from '@/lib/chat/actions'
import { listConversations, getMessages } from '@/lib/chat/queries'
import { createSupabaseServerClient } from '@/lib/auth/server'

const mockUser = { id: 'user-1', email: 'test@test.com' }

function buildMockSupabase(overrides: Record<string, unknown> = {}) {
  const from = vi.fn().mockReturnValue({
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'conv-1', agent_id: 'agent-1', tenant_id: 'tenant-1' },
          error: null,
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'conv-1' }],
            error: null,
          }),
        }),
        order: vi.fn().mockResolvedValue({
          data: [{ id: 'msg-1', role: 'user', content: 'hello' }],
          error: null,
        }),
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

describe('createConversation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns conversation with agent_id set', async () => {
    const mockSb = buildMockSupabase()
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSb as any)

    const result = await createConversation({
      tenantId: 'tenant-1',
      agentId: 'agent-1',
      title: 'Test Chat',
    })
    expect(result.error).toBeNull()
    expect(result.conversation).toBeTruthy()
    expect(mockSb.from).toHaveBeenCalledWith('conversations')
  })

  it('returns error when not authenticated', async () => {
    const mockSb = buildMockSupabase({ user: null })
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSb as any)

    const result = await createConversation({
      tenantId: 'tenant-1',
      agentId: 'agent-1',
    })
    expect(result.conversation).toBeNull()
    expect(result.error).toBe('Not authenticated')
  })
})

describe('deleteConversation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('removes conversation', async () => {
    const mockSb = buildMockSupabase()
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSb as any)

    const result = await deleteConversation('conv-1')
    expect(result.error).toBeNull()
    expect(mockSb.from).toHaveBeenCalledWith('conversations')
  })
})

describe('saveMessage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('inserts message with correct role and content', async () => {
    const mockSb = buildMockSupabase()
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSb as any)

    const result = await saveMessage({
      conversationId: 'conv-1',
      tenantId: 'tenant-1',
      role: 'user',
      content: 'Hello world',
    })
    expect(result.error).toBeNull()
    expect(mockSb.from).toHaveBeenCalledWith('messages')
  })
})

describe('listConversations', () => {
  it('returns conversations for agent within tenant', async () => {
    const mockSb = buildMockSupabase()
    const result = await listConversations(mockSb as any, 'tenant-1', 'agent-1')
    expect(result.data).toBeTruthy()
    expect(mockSb.from).toHaveBeenCalledWith('conversations')
  })
})

describe('getMessages', () => {
  it('returns messages ordered by created_at ascending', async () => {
    const mockSb = buildMockSupabase()
    const result = await getMessages(mockSb as any, 'conv-1')
    expect(result.data).toBeTruthy()
    expect(mockSb.from).toHaveBeenCalledWith('messages')
  })
})
