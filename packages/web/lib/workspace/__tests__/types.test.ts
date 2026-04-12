import { describe, it, expect } from 'vitest'
import {
  workspaceFormSchema,
  COLLABORATION_MODES,
  MEMORY_STRATEGIES,
  CollaborationMode,
  MemoryStrategy,
} from '../types'

describe('workspaceFormSchema', () => {
  it('validates correct input', () => {
    const result = workspaceFormSchema.safeParse({
      name: 'Test Workspace',
      description: 'A test workspace',
      collaboration_mode: 'round_robin',
      memory_strategy: 'conversation',
      conflict_resolution: 'vote',
      agent_ids: [],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = workspaceFormSchema.safeParse({
      name: '',
      collaboration_mode: 'round_robin',
      memory_strategy: 'conversation',
      conflict_resolution: 'vote',
      agent_ids: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid collaboration_mode', () => {
    const result = workspaceFormSchema.safeParse({
      name: 'Test',
      collaboration_mode: 'invalid_mode',
      memory_strategy: 'conversation',
      conflict_resolution: 'vote',
      agent_ids: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid memory_strategy', () => {
    const result = workspaceFormSchema.safeParse({
      name: 'Test',
      collaboration_mode: 'round_robin',
      memory_strategy: 'invalid_strategy',
      conflict_resolution: 'vote',
      agent_ids: [],
    })
    expect(result.success).toBe(false)
  })
})

describe('CollaborationMode', () => {
  it('includes round_robin', () => {
    expect(COLLABORATION_MODES).toContain('round_robin')
  })

  it('includes parallel', () => {
    expect(COLLABORATION_MODES).toContain('parallel')
  })

  it('includes sequential', () => {
    expect(COLLABORATION_MODES).toContain('sequential')
  })

  it('includes hierarchical', () => {
    expect(COLLABORATION_MODES).toContain('hierarchical')
  })

  it('includes democratic', () => {
    expect(COLLABORATION_MODES).toContain('democratic')
  })
})

describe('MemoryStrategy', () => {
  it('includes conversation', () => {
    expect(MEMORY_STRATEGIES).toContain('conversation')
  })

  it('includes summary', () => {
    expect(MEMORY_STRATEGIES).toContain('summary')
  })

  it('includes vector', () => {
    expect(MEMORY_STRATEGIES).toContain('vector')
  })

  it('includes hybrid', () => {
    expect(MEMORY_STRATEGIES).toContain('hybrid')
  })
})
