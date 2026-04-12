import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkspaceStore } from '@/lib/realtime/workspace-store'

// MUL-04: Store interaction tests — agent status, activity feed, streaming chunks
// REAL-03: Real-time agent status updates via zustand store

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset()
  })

  describe('connectionStatus', () => {
    it('defaults to disconnected', () => {
      expect(useWorkspaceStore.getState().connectionStatus).toBe('disconnected')
    })

    it('updates to connected', () => {
      useWorkspaceStore.getState().setConnectionStatus('connected')
      expect(useWorkspaceStore.getState().connectionStatus).toBe('connected')
    })

    it('updates to reconnecting', () => {
      useWorkspaceStore.getState().setConnectionStatus('reconnecting')
      expect(useWorkspaceStore.getState().connectionStatus).toBe('reconnecting')
    })

    it('updates to disconnected', () => {
      useWorkspaceStore.getState().setConnectionStatus('connected')
      useWorkspaceStore.getState().setConnectionStatus('disconnected')
      expect(useWorkspaceStore.getState().connectionStatus).toBe('disconnected')
    })
  })

  describe('agentStatuses (REAL-03)', () => {
    it('starts with empty map', () => {
      expect(useWorkspaceStore.getState().agentStatuses.size).toBe(0)
    })

    it('sets agent status to running', () => {
      useWorkspaceStore.getState().updateAgentStatus('agent-1', 'running')
      expect(useWorkspaceStore.getState().agentStatuses.get('agent-1')).toBe('running')
    })

    it('sets agent status to idle', () => {
      useWorkspaceStore.getState().updateAgentStatus('agent-1', 'running')
      useWorkspaceStore.getState().updateAgentStatus('agent-1', 'idle')
      expect(useWorkspaceStore.getState().agentStatuses.get('agent-1')).toBe('idle')
    })

    it('sets agent status to error', () => {
      useWorkspaceStore.getState().updateAgentStatus('agent-2', 'error')
      expect(useWorkspaceStore.getState().agentStatuses.get('agent-2')).toBe('error')
    })

    it('tracks multiple agents independently', () => {
      useWorkspaceStore.getState().updateAgentStatus('agent-1', 'running')
      useWorkspaceStore.getState().updateAgentStatus('agent-2', 'idle')
      useWorkspaceStore.getState().updateAgentStatus('agent-3', 'error')
      const statuses = useWorkspaceStore.getState().agentStatuses
      expect(statuses.get('agent-1')).toBe('running')
      expect(statuses.get('agent-2')).toBe('idle')
      expect(statuses.get('agent-3')).toBe('error')
    })
  })

  describe('activityFeed (MUL-04)', () => {
    it('starts empty', () => {
      expect(useWorkspaceStore.getState().activityFeed).toHaveLength(0)
    })

    it('adds system_event to feed', () => {
      useWorkspaceStore.getState().addActivity({
        id: 'evt-1',
        type: 'system_event',
        content: 'Workspace started',
        timestamp: new Date(),
      })
      const feed = useWorkspaceStore.getState().activityFeed
      expect(feed).toHaveLength(1)
      expect(feed[0].type).toBe('system_event')
      expect(feed[0].content).toBe('Workspace started')
    })

    it('adds agent_message to feed', () => {
      useWorkspaceStore.getState().addActivity({
        id: 'evt-2',
        type: 'agent_message',
        agentId: 'agent-1',
        targetAgentId: 'agent-2',
        content: 'Hello from agent 1',
        timestamp: new Date(),
      })
      const feed = useWorkspaceStore.getState().activityFeed
      expect(feed).toHaveLength(1)
      expect(feed[0].agentId).toBe('agent-1')
      expect(feed[0].targetAgentId).toBe('agent-2')
    })

    it('appends multiple events in order', () => {
      useWorkspaceStore.getState().addActivity({ id: 'a', type: 'system_event', content: 'first', timestamp: new Date() })
      useWorkspaceStore.getState().addActivity({ id: 'b', type: 'system_event', content: 'second', timestamp: new Date() })
      const feed = useWorkspaceStore.getState().activityFeed
      expect(feed).toHaveLength(2)
      expect(feed[0].content).toBe('first')
      expect(feed[1].content).toBe('second')
    })

    it('caps feed at 500 events', () => {
      for (let i = 0; i < 510; i++) {
        useWorkspaceStore.getState().addActivity({
          id: `evt-${i}`,
          type: 'system_event',
          content: `event ${i}`,
          timestamp: new Date(),
        })
      }
      expect(useWorkspaceStore.getState().activityFeed).toHaveLength(500)
    })

    it('keeps most recent events when cap exceeded', () => {
      for (let i = 0; i < 510; i++) {
        useWorkspaceStore.getState().addActivity({
          id: `evt-${i}`,
          type: 'system_event',
          content: `event ${i}`,
          timestamp: new Date(),
        })
      }
      const feed = useWorkspaceStore.getState().activityFeed
      // First 10 events (0-9) should be dropped; feed starts at event 10
      expect(feed[0].content).toBe('event 10')
      expect(feed[499].content).toBe('event 509')
    })
  })

  describe('streamingChunks', () => {
    it('starts with empty map', () => {
      expect(useWorkspaceStore.getState().streamingChunks.size).toBe(0)
    })

    it('accumulates chunks for an agent', () => {
      useWorkspaceStore.getState().appendChunk('agent-1', 'Hello')
      useWorkspaceStore.getState().appendChunk('agent-1', ' world')
      expect(useWorkspaceStore.getState().streamingChunks.get('agent-1')).toBe('Hello world')
    })

    it('tracks chunks for multiple agents independently', () => {
      useWorkspaceStore.getState().appendChunk('agent-1', 'foo')
      useWorkspaceStore.getState().appendChunk('agent-2', 'bar')
      const chunks = useWorkspaceStore.getState().streamingChunks
      expect(chunks.get('agent-1')).toBe('foo')
      expect(chunks.get('agent-2')).toBe('bar')
    })

    it('clears chunks for specific agent', () => {
      useWorkspaceStore.getState().appendChunk('agent-1', 'Hello')
      useWorkspaceStore.getState().appendChunk('agent-2', 'World')
      useWorkspaceStore.getState().clearChunks('agent-1')
      expect(useWorkspaceStore.getState().streamingChunks.get('agent-1')).toBeUndefined()
      expect(useWorkspaceStore.getState().streamingChunks.get('agent-2')).toBe('World')
    })
  })

  describe('reset', () => {
    it('clears all state', () => {
      useWorkspaceStore.getState().setConnectionStatus('connected')
      useWorkspaceStore.getState().updateAgentStatus('agent-1', 'running')
      useWorkspaceStore.getState().addActivity({ id: 'x', type: 'system_event', content: 'test', timestamp: new Date() })
      useWorkspaceStore.getState().appendChunk('agent-1', 'chunk')

      useWorkspaceStore.getState().reset()

      const state = useWorkspaceStore.getState()
      expect(state.connectionStatus).toBe('disconnected')
      expect(state.agentStatuses.size).toBe(0)
      expect(state.activityFeed).toHaveLength(0)
      expect(state.streamingChunks.size).toBe(0)
    })
  })
})
