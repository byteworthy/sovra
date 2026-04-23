import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const {
  socketHandlers,
  managerHandlers,
  socketMock,
  ioMock,
  getSessionMock,
} = vi.hoisted(() => {
  const socketHandlers = new Map<string, (...args: unknown[]) => void>()
  const managerHandlers = new Map<string, (...args: unknown[]) => void>()

  const socketMock = {
    on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
      socketHandlers.set(event, callback)
      return socketMock
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    io: {
      on: vi.fn((event: string, callback: (...args: unknown[]) => void) => {
        managerHandlers.set(event, callback)
        return socketMock.io
      }),
    },
    active: true,
  }

  const ioMock = vi.fn(() => socketMock)
  const getSessionMock = vi.fn().mockResolvedValue({
    data: { session: { access_token: 'session-token' } },
  })

  return { socketHandlers, managerHandlers, socketMock, ioMock, getSessionMock }
})

vi.mock('socket.io-client', () => ({
  io: ioMock,
}))

vi.mock('@/lib/auth/client', () => ({
  createSupabaseBrowserClient: vi.fn(() => ({
    auth: { getSession: getSessionMock },
  })),
}))

import { useWorkspaceSocket } from '@/lib/realtime/use-workspace-socket'
import { useWorkspaceStore } from '@/lib/realtime/workspace-store'

describe('useWorkspaceSocket', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    useWorkspaceStore.getState().reset()
    socketHandlers.clear()
    managerHandlers.clear()
    ioMock.mockClear()
    getSessionMock.mockClear()
    socketMock.on.mockClear()
    socketMock.emit.mockClear()
    socketMock.disconnect.mockClear()
    socketMock.io.on.mockClear()
    socketMock.active = true
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('sets disconnected state and skips socket setup when URL is missing', () => {
    delete process.env.NEXT_PUBLIC_WORKER_SOCKET_URL
    delete process.env.NEXT_PUBLIC_WORKER_URL

    renderHook(() => useWorkspaceSocket('tenant-1', 'workspace-1'))

    expect(ioMock).not.toHaveBeenCalled()
    expect(useWorkspaceStore.getState().connectionStatus).toBe('disconnected')
  })

  it('connects, joins workspace, and cleans up on unmount', async () => {
    process.env.NEXT_PUBLIC_WORKER_SOCKET_URL = 'https://worker.example'

    const { unmount } = renderHook(() => useWorkspaceSocket('tenant-1', 'workspace-1'))

    expect(ioMock).toHaveBeenCalledWith(
      'https://worker.example',
      expect.objectContaining({
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })
    )

    socketHandlers.get('connect')?.()

    await waitFor(() => {
      expect(socketMock.emit).toHaveBeenCalledWith(
        'workspace:join',
        'tenant-1',
        'workspace-1',
        'session-token'
      )
    })

    expect(useWorkspaceStore.getState().connectionStatus).toBe('connected')

    unmount()

    expect(socketMock.emit).toHaveBeenCalledWith('workspace:leave', 'tenant-1', 'workspace-1')
    expect(socketMock.disconnect).toHaveBeenCalledTimes(1)
  })

  it('updates connection status on reconnect and connect errors', () => {
    process.env.NEXT_PUBLIC_WORKER_SOCKET_URL = 'https://worker.example'

    renderHook(() => useWorkspaceSocket('tenant-1', 'workspace-1'))

    managerHandlers.get('reconnect_attempt')?.()
    expect(useWorkspaceStore.getState().connectionStatus).toBe('reconnecting')

    socketMock.active = false
    socketHandlers.get('connect_error')?.(new Error('denied'))
    expect(useWorkspaceStore.getState().connectionStatus).toBe('disconnected')

    socketMock.active = true
    socketHandlers.get('connect_error')?.(new Error('temporary'))
    expect(useWorkspaceStore.getState().connectionStatus).toBe('reconnecting')

    managerHandlers.get('reconnect_failed')?.()
    expect(useWorkspaceStore.getState().connectionStatus).toBe('disconnected')
  })
})
