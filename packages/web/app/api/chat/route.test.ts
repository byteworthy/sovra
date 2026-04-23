import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted mocks shared across vi.mock factories
const { mockStreamText, mockGetUser, mockSupabaseFrom, mockGetMcpClient, mockBuildAiToolsFromMcp } =
  vi.hoisted(() => ({
    mockStreamText: vi.fn(),
    mockGetUser: vi.fn(),
    mockSupabaseFrom: vi.fn(),
    mockGetMcpClient: vi.fn(),
    mockBuildAiToolsFromMcp: vi.fn(),
  }))

vi.mock('ai', () => ({
  streamText: mockStreamText,
  convertToModelMessages: vi.fn().mockImplementation((messages) => messages),
}))

vi.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockSupabaseFrom,
  }),
}))

vi.mock('@/lib/ai/registry', () => ({
  initProviders: vi.fn(),
  getProvider: vi.fn().mockReturnValue({
    getModel: vi.fn().mockReturnValue('mock-model'),
  }),
}))

vi.mock('@/lib/mcp/client', () => ({
  getMcpClient: mockGetMcpClient,
}))

vi.mock('@/lib/mcp/tool-registry', () => ({
  buildAiToolsFromMcp: mockBuildAiToolsFromMcp,
  getAgentTools: vi.fn().mockImplementation(
    (allTools: Record<string, unknown>, names: string[]) =>
      Object.fromEntries(names.map((n) => [n, allTools[n]]).filter(([, v]) => v != null))
  ),
}))

import { POST } from './route'
import { getProvider } from '@/lib/ai/registry'
import { AIProviderNotConfiguredError } from '@/lib/ai/adapter'

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const fakeAgent = {
  id: 'agent-1',
  tenant_id: 'tenant-1',
  model_provider: 'openai',
  model_name: 'gpt-4o',
  system_prompt: 'You are helpful.',
  temperature: 0.7,
  max_tokens: 4096,
  tools: ['web_search', 'file_read'],
  status: 'idle',
}

describe('POST /api/chat', () => {
  let insertedRows: Record<string, unknown>[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    insertedRows = []

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })

    // Supabase .from() chain mock
    const mockInsert = vi.fn().mockImplementation((row: Record<string, unknown>) => {
      insertedRows.push(row)
      return { error: null }
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'agents') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: fakeAgent }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'tenant_users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'tu-1' } }),
              }),
            }),
          }),
        }
      }
      if (table === 'tool_executions') {
        return { insert: mockInsert }
      }
      return {}
    })

    // MCP mocks -- tools available
    const mockMcpClient = { listTools: vi.fn(), callTool: vi.fn() }
    mockGetMcpClient.mockResolvedValue(mockMcpClient)
    mockBuildAiToolsFromMcp.mockResolvedValue({
      web_search: { type: 'function', name: 'web_search' },
      file_read: { type: 'function', name: 'file_read' },
      file_write: { type: 'function', name: 'file_write' },
    })

    // streamText mock
    mockStreamText.mockImplementation((opts: Record<string, unknown>) => {
      // Call onFinish to test tool tracking
      if (typeof opts.onFinish === 'function') {
        opts.onFinish({ steps: [] })
      }
      return { toUIMessageStreamResponse: () => new Response('stream', { status: 200 }) }
    })
  })

  it('passes tools from MCP registry filtered by agent.tools to streamText', async () => {
    const req = makeRequest({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      messages: [{ role: 'user', content: 'hello' }],
    })

    await POST(req)

    expect(mockStreamText).toHaveBeenCalledTimes(1)
    const callArgs = mockStreamText.mock.calls[0][0]
    // Should have web_search and file_read (from agent.tools), not file_write
    expect(callArgs.tools).toBeDefined()
    expect(Object.keys(callArgs.tools)).toContain('web_search')
    expect(Object.keys(callArgs.tools)).toContain('file_read')
    expect(Object.keys(callArgs.tools)).not.toContain('file_write')
  })

  it('passes core generation settings to streamText', async () => {
    const req = makeRequest({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      messages: [{ role: 'user', content: 'hello' }],
    })

    await POST(req)

    const callArgs = mockStreamText.mock.calls[0][0]
    expect(callArgs.maxOutputTokens).toBe(4096)
    expect(callArgs.temperature).toBe(0.7)
  })

  it('onFinish inserts tool_executions rows for each tool call in steps', async () => {
    mockStreamText.mockImplementation((opts: Record<string, unknown>) => {
      if (typeof opts.onFinish === 'function') {
        opts.onFinish({
          steps: [
            {
              toolCalls: [
                { toolCallId: 'tc-1', toolName: 'web_search', input: { query: 'test' } },
              ],
              toolResults: [
                { toolCallId: 'tc-1', output: 'search results' },
              ],
            },
            {
              toolCalls: [
                { toolCallId: 'tc-2', toolName: 'file_read', input: { path: '/tmp/f.txt' } },
              ],
              toolResults: [
                { toolCallId: 'tc-2', output: 'file content' },
              ],
            },
          ],
        })
      }
      return { toUIMessageStreamResponse: () => new Response('stream', { status: 200 }) }
    })

    const req = makeRequest({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      messages: [{ role: 'user', content: 'hello' }],
    })

    await POST(req)

    expect(insertedRows).toHaveLength(2)
    expect(insertedRows[0]).toMatchObject({
      tool_name: 'web_search',
      status: 'success',
      agent_id: 'agent-1',
      conversation_id: 'conv-1',
    })
    expect(insertedRows[1]).toMatchObject({
      tool_name: 'file_read',
      status: 'success',
    })
  })

  it('tool_executions rows include tenant_id from agent record', async () => {
    mockStreamText.mockImplementation((opts: Record<string, unknown>) => {
      if (typeof opts.onFinish === 'function') {
        opts.onFinish({
          steps: [{
            toolCalls: [{ toolCallId: 'tc-1', toolName: 'web_search', input: {} }],
            toolResults: [{ toolCallId: 'tc-1', output: 'ok' }],
          }],
        })
      }
      return { toUIMessageStreamResponse: () => new Response('stream', { status: 200 }) }
    })

    const req = makeRequest({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      messages: [{ role: 'user', content: 'hello' }],
    })

    await POST(req)

    expect(insertedRows[0]).toMatchObject({ tenant_id: 'tenant-1' })
  })

  it('tool_executions rows include cost_usd estimates', async () => {
    mockStreamText.mockImplementation((opts: Record<string, unknown>) => {
      if (typeof opts.onFinish === 'function') {
        opts.onFinish({
          steps: [{
            toolCalls: [{ toolCallId: 'tc-1', toolName: 'web_search', input: {} }],
            toolResults: [{ toolCallId: 'tc-1', output: 'ok' }],
          }],
        })
      }
      return { toUIMessageStreamResponse: () => new Response('stream', { status: 200 }) }
    })

    const req = makeRequest({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      messages: [{ role: 'user', content: 'hello' }],
    })

    await POST(req)

    expect(insertedRows[0]).toHaveProperty('cost_usd')
    expect(typeof insertedRows[0].cost_usd).toBe('number')
  })

  it('graceful degradation when MCP connection fails -- no tools, still streams', async () => {
    mockGetMcpClient.mockRejectedValue(new Error('MCP connection refused'))

    const req = makeRequest({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      messages: [{ role: 'user', content: 'hello' }],
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    // streamText should be called without tools (or tools undefined)
    const callArgs = mockStreamText.mock.calls[0][0]
    expect(callArgs.tools).toBeUndefined()
  })

  it('returns 503 when provider is unknown during model resolution', async () => {
    vi.mocked(getProvider).mockImplementation(() => {
      throw new Error('Unknown provider: unknown')
    })

    const req = makeRequest({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      messages: [{ role: 'user', content: 'hello' }],
    })

    const res = await POST(req)
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toEqual({
      error: 'AI provider "openai" is not configured. Check your API keys.',
    })
  })

  it('returns 503 when provider API key is missing during model resolution', async () => {
    vi.mocked(getProvider).mockReturnValue({
      getModel: () => {
        throw new AIProviderNotConfiguredError('openai')
      },
    } as never)

    const req = makeRequest({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      messages: [{ role: 'user', content: 'hello' }],
    })

    const res = await POST(req)
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.toEqual({
      error: 'AI provider "openai" is not configured. Check your API keys.',
    })
  })

  it('returns 500 when provider resolution fails with an unexpected error', async () => {
    vi.mocked(getProvider).mockReturnValue({
      getModel: () => {
        throw new Error('unexpected provider runtime failure')
      },
    } as never)

    const req = makeRequest({
      agentId: 'agent-1',
      conversationId: 'conv-1',
      messages: [{ role: 'user', content: 'hello' }],
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({
      error: 'An error occurred while resolving the AI provider.',
    })
  })
})
