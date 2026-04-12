'use client'

import { create } from 'zustand'

export interface AgentStatusUpdate {
  agentId: string
  status: 'idle' | 'running' | 'error'
}

export interface AgentChunkUpdate {
  agentId: string
  chunk: string
}

export interface AgentMessageUpdate {
  agentId: string
  message: string
  targetAgentId?: string
}

export interface ActivityEvent {
  id: string
  type: 'system_event' | 'agent_message' | 'tool_call' | 'conflict'
  agentId?: string
  targetAgentId?: string
  content: string
  timestamp: Date
}

const ACTIVITY_FEED_CAP = 500

export interface WorkspaceStoreState {
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
  agentStatuses: Map<string, 'idle' | 'running' | 'error'>
  activityFeed: ActivityEvent[]
  streamingChunks: Map<string, string>
  setConnectionStatus: (status: 'connected' | 'reconnecting' | 'disconnected') => void
  updateAgentStatus: (agentId: string, status: 'idle' | 'running' | 'error') => void
  addActivity: (event: ActivityEvent) => void
  appendChunk: (agentId: string, chunk: string) => void
  clearChunks: (agentId: string) => void
  reset: () => void
}

const initialState = {
  connectionStatus: 'disconnected' as const,
  agentStatuses: new Map<string, 'idle' | 'running' | 'error'>(),
  activityFeed: [] as ActivityEvent[],
  streamingChunks: new Map<string, string>(),
}

export const useWorkspaceStore = create<WorkspaceStoreState>((set, get) => ({
  ...initialState,

  setConnectionStatus(status) {
    set({ connectionStatus: status })
  },

  updateAgentStatus(agentId, status) {
    set((state) => {
      const next = new Map(state.agentStatuses)
      next.set(agentId, status)
      return { agentStatuses: next }
    })
  },

  addActivity(event) {
    set((state) => {
      const feed = [...state.activityFeed, event]
      return {
        activityFeed: feed.length > ACTIVITY_FEED_CAP ? feed.slice(feed.length - ACTIVITY_FEED_CAP) : feed,
      }
    })
  },

  appendChunk(agentId, chunk) {
    set((state) => {
      const next = new Map(state.streamingChunks)
      next.set(agentId, (next.get(agentId) ?? '') + chunk)
      return { streamingChunks: next }
    })
  },

  clearChunks(agentId) {
    set((state) => {
      const next = new Map(state.streamingChunks)
      next.delete(agentId)
      return { streamingChunks: next }
    })
  },

  reset() {
    set({
      connectionStatus: 'disconnected',
      agentStatuses: new Map(),
      activityFeed: [],
      streamingChunks: new Map(),
    })
  },
}))
