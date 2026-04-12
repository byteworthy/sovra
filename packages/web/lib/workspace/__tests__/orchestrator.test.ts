import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before imports
vi.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/ai/registry', () => ({
  getProvider: vi.fn(),
  initProviders: vi.fn(),
}))

vi.mock('@/lib/memory/types', () => ({
  buildContextMessages: vi.fn(),
}))

vi.mock('../broadcast', () => ({
  broadcastAgentStatus: vi.fn().mockResolvedValue(undefined),
  broadcastAgentMessage: vi.fn().mockResolvedValue(undefined),
  broadcastAgentDone: vi.fn().mockResolvedValue(undefined),
  broadcastToWorkspace: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../shared-memory', () => ({
  upsertSharedMemory: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

vi.mock('ai', () => ({
  generateText: vi.fn(),
}))

import { createSupabaseServerClient } from '@/lib/auth/server'
import { getProvider, initProviders } from '@/lib/ai/registry'
import { buildContextMessages } from '@/lib/memory/types'
import {
  broadcastAgentStatus,
  broadcastAgentMessage,
} from '../broadcast'
import { upsertSharedMemory } from '../shared-memory'
import { generateText } from 'ai'
import {
  runRoundRobin,
  runParallel,
  runSequential,
  runWorkspace,
} from '../orchestrator'

const mockModel = { __brand: 'model' }

const mockAdapter = {
  getModel: vi.fn().mockReturnValue(mockModel),
}

function buildSupabaseMock(workspace: object, agents: object[]) {
  const agentUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === 'workspaces') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: workspace, error: null }),
          }),
        }),
      }
    }
    if (table === 'workspace_agents') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: agents, error: null }),
          }),
        }),
      }
    }
    if (table === 'agents') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(async () => {
              const agentRow = agents.find(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (a: any) => a.agent_id === (a as any).agent_id
              )
              return { data: agentRow ?? agents[0], error: null }
            }),
          }),
        }),
        update: agentUpdate,
      }
    }
    return {}
  })

  return { from: fromMock }
}

describe('broadcastAgentStatus', () => {
  it('broadcasts running then idle around agent execution', async () => {
    const workspace = {
      id: 'ws-1',
      tenant_id: 'tenant-1',
      collaboration_mode: 'round_robin',
      conflict_resolution: 'vote',
      memory_strategy: 'conversation',
    }

    const agentRecord = {
      id: 'agent-1',
      agent_id: 'agent-1',
      workspace_id: 'ws-1',
      role: 'member',
      position: 0,
      model_provider: 'openai',
      model_name: 'gpt-4o',
      system_prompt: 'You are helpful',
    }

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'agents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: agentRecord, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {}
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never)
    vi.mocked(getProvider).mockReturnValue(mockAdapter as never)
    vi.mocked(buildContextMessages).mockResolvedValue([])
    vi.mocked(generateText).mockResolvedValue({ text: 'agent response' } as never)

    await runRoundRobin(
      supabase as never,
      [agentRecord as never],
      'test prompt',
      workspace as never,
      'tenant-1'
    )

    expect(broadcastAgentStatus).toHaveBeenCalledWith(
      'tenant-1', 'ws-1', 'agent-1', 'running'
    )
    expect(broadcastAgentStatus).toHaveBeenCalledWith(
      'tenant-1', 'ws-1', 'agent-1', 'idle'
    )
  })
})

describe('runRoundRobin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls agents in order, passing each output as next input', async () => {
    const workspace = {
      id: 'ws-1',
      tenant_id: 'tenant-1',
      collaboration_mode: 'round_robin',
      conflict_resolution: 'vote',
      memory_strategy: 'conversation',
    }

    const agents = [
      {
        id: 'wa-1',
        agent_id: 'agent-1',
        role: 'member',
        position: 0,
        model_provider: 'openai',
        model_name: 'gpt-4o',
        system_prompt: null,
      },
      {
        id: 'wa-2',
        agent_id: 'agent-2',
        role: 'member',
        position: 1,
        model_provider: 'openai',
        model_name: 'gpt-4o',
        system_prompt: null,
      },
    ]

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: agents[0], error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }

    vi.mocked(getProvider).mockReturnValue(mockAdapter as never)
    vi.mocked(buildContextMessages).mockResolvedValue([])

    let callCount = 0
    vi.mocked(generateText).mockImplementation(async () => {
      callCount++
      return { text: `response-${callCount}` } as never
    })

    const result = await runRoundRobin(
      supabase as never,
      agents as never,
      'initial prompt',
      workspace as never,
      'tenant-1'
    )

    // Both agents should have been called
    expect(generateText).toHaveBeenCalledTimes(2)
    // Last agent's output should be returned
    expect(result.text).toBe('response-2')
  })

  it('passes output of agent N as input to agent N+1', async () => {
    const workspace = {
      id: 'ws-1',
      tenant_id: 'tenant-1',
      collaboration_mode: 'round_robin',
      conflict_resolution: 'vote',
      memory_strategy: 'conversation',
    }

    const agents = [
      {
        id: 'wa-1',
        agent_id: 'agent-1',
        role: 'member',
        position: 0,
        model_provider: 'openai',
        model_name: 'gpt-4o',
        system_prompt: null,
      },
      {
        id: 'wa-2',
        agent_id: 'agent-2',
        role: 'member',
        position: 1,
        model_provider: 'openai',
        model_name: 'gpt-4o',
        system_prompt: null,
      },
    ]

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: agents[0], error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }

    vi.mocked(getProvider).mockReturnValue(mockAdapter as never)

    const buildContextCalls: string[] = []
    vi.mocked(buildContextMessages).mockImplementation(async (params) => {
      buildContextCalls.push(params.prompt)
      return []
    })

    let callCount = 0
    vi.mocked(generateText).mockImplementation(async () => {
      callCount++
      return { text: `output-from-agent-${callCount}` } as never
    })

    await runRoundRobin(
      supabase as never,
      agents as never,
      'initial prompt',
      workspace as never,
      'tenant-1'
    )

    expect(buildContextCalls[0]).toBe('initial prompt')
    expect(buildContextCalls[1]).toBe('output-from-agent-1')
  })
})

describe('runParallel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls all agents concurrently and returns array of results', async () => {
    const workspace = {
      id: 'ws-1',
      tenant_id: 'tenant-1',
      collaboration_mode: 'parallel',
      conflict_resolution: 'vote',
      memory_strategy: 'conversation',
    }

    const agents = [
      { id: 'wa-1', agent_id: 'agent-1', role: 'member', position: 0, model_provider: 'openai', model_name: 'gpt-4o', system_prompt: null },
      { id: 'wa-2', agent_id: 'agent-2', role: 'member', position: 1, model_provider: 'openai', model_name: 'gpt-4o', system_prompt: null },
      { id: 'wa-3', agent_id: 'agent-3', role: 'leader', position: 2, model_provider: 'openai', model_name: 'gpt-4o', system_prompt: null },
    ]

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: agents[0], error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }

    vi.mocked(getProvider).mockReturnValue(mockAdapter as never)
    vi.mocked(buildContextMessages).mockResolvedValue([])
    vi.mocked(generateText).mockResolvedValue({ text: 'parallel response' } as never)

    const results = await runParallel(
      supabase as never,
      agents as never,
      'prompt',
      workspace as never,
      'tenant-1'
    )

    expect(results).toHaveLength(3)
    expect(generateText).toHaveBeenCalledTimes(3)
  })
})

describe('runSequential', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls agents in position order and chains outputs', async () => {
    const workspace = {
      id: 'ws-1',
      tenant_id: 'tenant-1',
      collaboration_mode: 'sequential',
      conflict_resolution: 'vote',
      memory_strategy: 'conversation',
    }

    // Agents provided in reverse order — should be sorted by position
    const agents = [
      { id: 'wa-2', agent_id: 'agent-2', role: 'member', position: 1, model_provider: 'openai', model_name: 'gpt-4o', system_prompt: null },
      { id: 'wa-1', agent_id: 'agent-1', role: 'member', position: 0, model_provider: 'openai', model_name: 'gpt-4o', system_prompt: null },
    ]

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: agents[0], error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }

    vi.mocked(getProvider).mockReturnValue(mockAdapter as never)

    const promptsUsed: string[] = []
    vi.mocked(buildContextMessages).mockImplementation(async (params) => {
      promptsUsed.push(params.prompt)
      return []
    })

    let callIdx = 0
    vi.mocked(generateText).mockImplementation(async () => {
      callIdx++
      return { text: `seq-response-${callIdx}` } as never
    })

    await runSequential(
      supabase as never,
      agents as never,
      'start',
      workspace as never,
      'tenant-1'
    )

    // Should process position 0 first
    expect(promptsUsed[0]).toBe('start')
    expect(promptsUsed[1]).toBe('seq-response-1')
  })
})

describe('runWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes to round_robin when collaboration_mode is round_robin', async () => {
    const workspace = {
      id: 'ws-1',
      tenant_id: 'tenant-1',
      collaboration_mode: 'round_robin',
      conflict_resolution: 'vote',
      memory_strategy: 'conversation',
    }

    const agents = [
      { id: 'wa-1', agent_id: 'agent-1', role: 'member', position: 0, model_provider: 'openai', model_name: 'gpt-4o', system_prompt: null },
    ]

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: workspace, error: null }),
              }),
            }),
          }
        }
        if (table === 'workspace_agents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: agents, error: null }),
              }),
            }),
          }
        }
        if (table === 'agents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: agents[0], error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {}
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never)
    vi.mocked(initProviders).mockReturnValue(undefined)
    vi.mocked(getProvider).mockReturnValue(mockAdapter as never)
    vi.mocked(buildContextMessages).mockResolvedValue([])
    vi.mocked(generateText).mockResolvedValue({ text: 'routed result' } as never)

    const result = await runWorkspace('ws-1', 'prompt')

    expect(result).toBeDefined()
    expect(generateText).toHaveBeenCalled()
  })

  it('stores final result in shared_memory with key last_result', async () => {
    const workspace = {
      id: 'ws-1',
      tenant_id: 'tenant-1',
      collaboration_mode: 'sequential',
      conflict_resolution: 'vote',
      memory_strategy: 'conversation',
    }

    const agents = [
      { id: 'wa-1', agent_id: 'agent-1', role: 'member', position: 0, model_provider: 'openai', model_name: 'gpt-4o', system_prompt: null },
    ]

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: workspace, error: null }),
              }),
            }),
          }
        }
        if (table === 'workspace_agents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: agents, error: null }),
              }),
            }),
          }
        }
        if (table === 'agents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: agents[0], error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {}
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never)
    vi.mocked(initProviders).mockReturnValue(undefined)
    vi.mocked(getProvider).mockReturnValue(mockAdapter as never)
    vi.mocked(buildContextMessages).mockResolvedValue([])
    vi.mocked(generateText).mockResolvedValue({ text: 'final text' } as never)

    await runWorkspace('ws-1', 'prompt')

    expect(upsertSharedMemory).toHaveBeenCalledWith(
      'ws-1',
      'last_result',
      expect.objectContaining({ text: 'final text' })
    )
  })

  it('uses buildContextMessages with workspace memory strategy', async () => {
    const workspace = {
      id: 'ws-1',
      tenant_id: 'tenant-1',
      collaboration_mode: 'round_robin',
      conflict_resolution: 'vote',
      memory_strategy: 'summary',
    }

    const agents = [
      { id: 'wa-1', agent_id: 'agent-1', role: 'member', position: 0, model_provider: 'openai', model_name: 'gpt-4o', system_prompt: null },
    ]

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'workspaces') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: workspace, error: null }),
              }),
            }),
          }
        }
        if (table === 'workspace_agents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: agents, error: null }),
              }),
            }),
          }
        }
        if (table === 'agents') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: agents[0], error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {}
      }),
    }

    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase as never)
    vi.mocked(initProviders).mockReturnValue(undefined)
    vi.mocked(getProvider).mockReturnValue(mockAdapter as never)
    vi.mocked(buildContextMessages).mockResolvedValue([])
    vi.mocked(generateText).mockResolvedValue({ text: 'done' } as never)

    await runWorkspace('ws-1', 'hello')

    expect(buildContextMessages).toHaveBeenCalledWith(
      expect.objectContaining({ strategy: 'summary' })
    )
  })
})
