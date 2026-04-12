'use client'

import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useWorkspaceStore } from './workspace-store'

export function useWorkspaceSocket(tenantId: string, workspaceId: string) {
  const socketRef = useRef<Socket | null>(null)
  const { setConnectionStatus, updateAgentStatus, addActivity, appendChunk, clearChunks } =
    useWorkspaceStore()

  useEffect(() => {
    const socket = io(
      process.env.NEXT_PUBLIC_WORKER_SOCKET_URL || 'http://localhost:3002',
      {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    )

    const joinRoom = () => socket.emit('workspace:join', tenantId, workspaceId)

    socket.on('connect', () => {
      setConnectionStatus('connected')
      joinRoom()
    })

    // REAL-05: rejoin room on reconnect
    socket.on('reconnect', () => {
      setConnectionStatus('connected')
      joinRoom()
    })

    socket.on('disconnect', () => setConnectionStatus('disconnected'))

    socket.io.on('reconnect_attempt', () => setConnectionStatus('reconnecting'))

    socket.on('workspace:joined', () => {
      // Room joined confirmation. Connection status already set on connect event.
    })

    socket.on('agent:status', (data: { agentId: string; status: 'idle' | 'running' | 'error' }) => {
      updateAgentStatus(data.agentId, data.status)
    })

    socket.on(
      'agent:message',
      (data: { agentId: string; targetAgentId?: string; message: string }) => {
        addActivity({
          id: crypto.randomUUID(),
          type: 'agent_message',
          agentId: data.agentId,
          targetAgentId: data.targetAgentId,
          content: data.message,
          timestamp: new Date(),
        })
      }
    )

    socket.on('agent:chunk', (data: { agentId: string; chunk: string }) => {
      appendChunk(data.agentId, data.chunk)
    })

    socket.on('agent:done', (data: { agentId: string }) => {
      clearChunks(data.agentId)
    })

    socketRef.current = socket

    return () => {
      socket.emit('workspace:leave', tenantId, workspaceId)
      socket.disconnect()
    }
  }, [tenantId, workspaceId])

  return socketRef
}
