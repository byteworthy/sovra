import { describe, it, expect } from 'vitest'
import {
  resolveByVote,
  resolveByHierarchy,
  resolveByConsensus,
  resolveConflict,
} from '../conflict'
import type { AgentResponse } from '../conflict'

describe('resolveByVote', () => {
  it('returns the majority response when 2 of 3 match', () => {
    const responses: AgentResponse[] = [
      { agentId: 'a1', text: 'Paris', role: 'member' },
      { agentId: 'a2', text: 'Paris', role: 'member' },
      { agentId: 'a3', text: 'London', role: 'member' },
    ]
    const result = resolveByVote(responses)
    expect(result.text).toBe('Paris')
  })

  it('returns first response as tie-break when all responses are unique', () => {
    const responses: AgentResponse[] = [
      { agentId: 'a1', text: 'Paris', role: 'member' },
      { agentId: 'a2', text: 'London', role: 'member' },
      { agentId: 'a3', text: 'Berlin', role: 'member' },
    ]
    const result = resolveByVote(responses)
    expect(result.text).toBe('Paris')
    expect(result.agentId).toBe('a1')
  })

  it('handles single response', () => {
    const responses: AgentResponse[] = [
      { agentId: 'a1', text: 'only answer', role: 'leader' },
    ]
    const result = resolveByVote(responses)
    expect(result.text).toBe('only answer')
  })

  it('returns response with highest count when one answer wins', () => {
    const responses: AgentResponse[] = [
      { agentId: 'a1', text: 'answer-A', role: 'member' },
      { agentId: 'a2', text: 'answer-B', role: 'member' },
      { agentId: 'a3', text: 'answer-A', role: 'member' },
      { agentId: 'a4', text: 'answer-A', role: 'member' },
    ]
    const result = resolveByVote(responses)
    expect(result.text).toBe('answer-A')
  })
})

describe('resolveByHierarchy', () => {
  it('returns the leader agent response', () => {
    const responses: AgentResponse[] = [
      { agentId: 'a1', text: 'member answer', role: 'member' },
      { agentId: 'a2', text: 'leader answer', role: 'leader' },
      { agentId: 'a3', text: 'other answer', role: 'member' },
    ]
    const result = resolveByHierarchy(responses)
    expect(result.text).toBe('leader answer')
    expect(result.role).toBe('leader')
  })

  it('falls back to first response when no leader exists', () => {
    const responses: AgentResponse[] = [
      { agentId: 'a1', text: 'first member', role: 'member' },
      { agentId: 'a2', text: 'second member', role: 'member' },
    ]
    const result = resolveByHierarchy(responses)
    expect(result.text).toBe('first member')
    expect(result.agentId).toBe('a1')
  })
})

describe('resolveByConsensus', () => {
  it('returns the single response when all agents agree', () => {
    const responses: AgentResponse[] = [
      { agentId: 'a1', text: 'agreed answer', role: 'member' },
      { agentId: 'a2', text: 'agreed answer', role: 'member' },
      { agentId: 'a3', text: 'agreed answer', role: 'member' },
    ]
    const result = resolveByConsensus(responses)
    expect(result.text).toBe('agreed answer')
  })

  it('falls back to vote when agents disagree', () => {
    const responses: AgentResponse[] = [
      { agentId: 'a1', text: 'majority answer', role: 'member' },
      { agentId: 'a2', text: 'majority answer', role: 'member' },
      { agentId: 'a3', text: 'minority answer', role: 'member' },
    ]
    const result = resolveByConsensus(responses)
    // Falls back to vote, majority wins
    expect(result.text).toBe('majority answer')
  })
})

describe('resolveConflict', () => {
  it('routes to vote strategy', () => {
    const responses: AgentResponse[] = [
      { agentId: 'a1', text: 'same', role: 'member' },
      { agentId: 'a2', text: 'same', role: 'member' },
      { agentId: 'a3', text: 'different', role: 'member' },
    ]
    const result = resolveConflict('vote', responses)
    expect(result.text).toBe('same')
  })

  it('routes to hierarchy strategy', () => {
    const responses: AgentResponse[] = [
      { agentId: 'a1', text: 'member says X', role: 'member' },
      { agentId: 'a2', text: 'leader says Y', role: 'leader' },
    ]
    const result = resolveConflict('hierarchy', responses)
    expect(result.text).toBe('leader says Y')
  })

  it('routes to consensus strategy', () => {
    const responses: AgentResponse[] = [
      { agentId: 'a1', text: 'consensus', role: 'member' },
      { agentId: 'a2', text: 'consensus', role: 'member' },
    ]
    const result = resolveConflict('consensus', responses)
    expect(result.text).toBe('consensus')
  })
})
