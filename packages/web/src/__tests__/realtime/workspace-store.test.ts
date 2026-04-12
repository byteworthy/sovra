import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkspaceStore } from '@/lib/realtime/workspace-store'

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().reset()
  })

  describe('initial state', () => {
    it('starts disconnected', () => {
      expect(useWorkspaceStore.getState().connectionStatus).toBe('disconnected')
    })

    it('starts with empty agent statuses', () => {
      expect(useWorkspaceStore.getState().agentStatuses.size).toBe(0)
    })

    it('starts with empty activity feed', () => {
      expect(useWorkspaceStore.getState().activityFeed).toHaveLength(0)
    })

    it('starts with empty streaming chunks', () => {
      expect(useWorkspaceStore.getState().streamingChunks.size).toBe(0)
    })
  })

  describe('setConnectionStatus', () => {
    it('updates connection status to connected', () => {
      useWorkspaceStore.getState().setConnectionStatus('connected')
      expect(useWorkspaceStore.getState().connectionStatus).toBe('connected')
    })

    it('updates connection status to reconnecting', () => {
      useWorkspaceStore.getState().setConnectionStatus('reconnecting')
      expect(useWorkspaceStore.getState().connectionStatus).toBe('reconnecting')
    })

    it('updates connection status to disconnected', () => {
      useWorkspaceStore.getState().setConnectionStatus('connected')
      useWorkspaceStore.getState().setConnectionStatus('disconnected')
      expect(useWorkspaceStore.getState().connectionStatus).toBe('disconnected')
    })
  })

  describe('updateAgentStatus', () => {
    it('sets an agent status', () => {
      useWorkspaceStore.getState().updateAgentStatus('agent-1', 'running')
      expect(useWorkspaceStore.getState().agentStatuses.get('agent-1')).toBe('running')
    })

    it('updates existing agent status', () => {
      useWorkspaceStore.getState().updateAgentStatus('agent-1', 'running')
      useWorkspaceStore.getState().updateAgentStatus('agent-1', 'idle')
      expect(useWorkspaceStore.getState().agentStatuses.get('agent-1')).toBe('idle')
    })

    it('tracks multiple agents independently', () => {
      useWorkspaceStore.getState().updateAgentStatus('agent-1', 'running')
      useWorkspaceStore.getState().updateAgentStatus('agent-2', 'error')
      const { agentStatuses } = useWorkspaceStore.getState()
      expect(agentStatuses.get('agent-1')).toBe('running')
      expect(agentStatuses.get('agent-2')).toBe('error')
    })
  })

  describe('addActivity', () => {
    it('adds an activity event to the feed', () => {
      const event = {
        id: 'evt-1',
        type: 'system_event' as const,
        content: 'Workspace started',
        timestamp: new Date(),
      }
      useWorkspaceStore.getState().addActivity(event)
      expect(useWorkspaceStore.getState().activityFeed).toHaveLength(1)
      expect(useWorkspaceStore.getState().activityFeed[0]).toEqual(event)
    })

    it('appends events in order', () => {
      const event1 = { id: 'evt-1', type: 'system_event' as const, content: 'First', timestamp: new Date() }
      const event2 = { id: 'evt-2', type: 'agent_message' as const, agentId: 'agent-1', content: 'Hello', timestamp: new Date() }
      useWorkspaceStore.getState().addActivity(event1)
      useWorkspaceStore.getState().addActivity(event2)
      const { activityFeed } = useWorkspaceStore.getState()
      expect(activityFeed[0].id).toBe('evt-1')
      expect(activityFeed[1].id).toBe('evt-2')
    })

    it('caps activity feed at 500 events by shifting oldest', () => {
      for (let i = 0; i < 505; i++) {
        useWorkspaceStore.getState().addActivity({
          id: `evt-${i}`,
          type: 'system_event',
          content: `Event ${i}`,
          timestamp: new Date(),
        })
      }
      const { activityFeed } = useWorkspaceStore.getState()
      expect(activityFeed).toHaveLength(500)
      // Oldest events should have been shifted out
      expect(activityFeed[0].id).toBe('evt-5')
    })
  })

  describe('appendChunk', () => {
    it('creates chunk entry for new agent', () => {
      useWorkspaceStore.getState().appendChunk('agent-1', 'Hello')
      expect(useWorkspaceStore.getState().streamingChunks.get('agent-1')).toBe('Hello')
    })

    it('accumulates chunks for same agent', () => {
      useWorkspaceStore.getState().appendChunk('agent-1', 'Hello')
      useWorkspaceStore.getState().appendChunk('agent-1', ' world')
      expect(useWorkspaceStore.getState().streamingChunks.get('agent-1')).toBe('Hello world')
    })

    it('tracks chunks for multiple agents independently', () => {
      useWorkspaceStore.getState().appendChunk('agent-1', 'Chunk A')
      useWorkspaceStore.getState().appendChunk('agent-2', 'Chunk B')
      expect(useWorkspaceStore.getState().streamingChunks.get('agent-1')).toBe('Chunk A')
      expect(useWorkspaceStore.getState().streamingChunks.get('agent-2')).toBe('Chunk B')
    })
  })

  describe('clearChunks', () => {
    it('removes streaming chunks for agent', () => {
      useWorkspaceStore.getState().appendChunk('agent-1', 'Some text')
      useWorkspaceStore.getState().clearChunks('agent-1')
      expect(useWorkspaceStore.getState().streamingChunks.get('agent-1')).toBeUndefined()
    })

    it('does not affect other agents chunks', () => {
      useWorkspaceStore.getState().appendChunk('agent-1', 'Text A')
      useWorkspaceStore.getState().appendChunk('agent-2', 'Text B')
      useWorkspaceStore.getState().clearChunks('agent-1')
      expect(useWorkspaceStore.getState().streamingChunks.get('agent-2')).toBe('Text B')
    })
  })

  describe('reset', () => {
    it('resets all state to initial values', () => {
      useWorkspaceStore.getState().setConnectionStatus('connected')
      useWorkspaceStore.getState().updateAgentStatus('agent-1', 'running')
      useWorkspaceStore.getState().addActivity({ id: 'evt-1', type: 'system_event', content: 'test', timestamp: new Date() })
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
