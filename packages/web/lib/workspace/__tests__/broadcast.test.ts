import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  broadcastToWorkspace,
  broadcastAgentChunk,
  broadcastAgentDone,
} from '../broadcast'

describe('workspace broadcast client', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('prefers WORKER_INTERNAL_URL over NEXT_PUBLIC_WORKER_URL and trims trailing slash', async () => {
    process.env.WORKER_INTERNAL_URL = 'http://worker-internal:3002/'
    process.env.NEXT_PUBLIC_WORKER_URL = 'http://public-worker:3002'
    process.env.INTERNAL_API_SECRET = 'secret-123'

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }))

    await broadcastToWorkspace('tenant-1', 'workspace-1', 'agent:status', {
      status: 'running',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://worker-internal:3002/internal/broadcast',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-123',
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  it('throws detailed error when worker responds with non-2xx', async () => {
    process.env.NEXT_PUBLIC_WORKER_URL = 'http://localhost:3002'

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('unauthorized', { status: 401, statusText: 'Unauthorized' })
    )

    await expect(
      broadcastToWorkspace('tenant-1', 'workspace-1', 'agent:status', {
        status: 'running',
      })
    ).rejects.toThrow(/Worker broadcast failed \(401 Unauthorized\)/)
  })

  it('throws detailed error when request transport fails', async () => {
    process.env.NEXT_PUBLIC_WORKER_URL = 'http://localhost:3002'

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    await expect(
      broadcastToWorkspace('tenant-1', 'workspace-1', 'agent:status', {
        status: 'running',
      })
    ).rejects.toThrow(/Worker broadcast request failed/)
  })

  it('keeps agent chunk and done helpers wired to broadcast events', async () => {
    process.env.NEXT_PUBLIC_WORKER_URL = 'http://localhost:3002'

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }))

    await broadcastAgentChunk('tenant-1', 'workspace-1', 'agent-1', 'chunk')
    await broadcastAgentDone('tenant-1', 'workspace-1', 'agent-1')

    expect(fetchMock).toHaveBeenCalledTimes(2)

    const [chunkBody, doneBody] = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string)
    )

    expect(chunkBody.event).toBe('agent:chunk')
    expect(doneBody.event).toBe('agent:done')
  })

  it('throws when worker URL is not configured', async () => {
    delete process.env.WORKER_INTERNAL_URL
    delete process.env.NEXT_PUBLIC_WORKER_URL
    delete process.env.NEXT_PUBLIC_WORKER_SOCKET_URL

    await expect(
      broadcastToWorkspace('tenant-1', 'workspace-1', 'agent:status', {
        status: 'running',
      })
    ).rejects.toThrow(/Worker broadcast URL is not configured/)
  })

  it('accepts NEXT_PUBLIC_WORKER_SOCKET_URL as fallback', async () => {
    delete process.env.WORKER_INTERNAL_URL
    delete process.env.NEXT_PUBLIC_WORKER_URL
    process.env.NEXT_PUBLIC_WORKER_SOCKET_URL = 'https://worker-socket.example:3002/'

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }))

    await broadcastToWorkspace('tenant-1', 'workspace-1', 'agent:status', {
      status: 'running',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://worker-socket.example:3002/internal/broadcast',
      expect.any(Object)
    )
  })

  it('rejects non-http worker URL protocols', async () => {
    process.env.WORKER_INTERNAL_URL = 'file:///tmp/worker.sock'

    await expect(
      broadcastToWorkspace('tenant-1', 'workspace-1', 'agent:status', {
        status: 'running',
      })
    ).rejects.toThrow(/Unsupported worker broadcast protocol/)
  })
})
