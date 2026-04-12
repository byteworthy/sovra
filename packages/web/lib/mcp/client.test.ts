import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockConnect } = vi.hoisted(() => ({
  mockConnect: vi.fn(),
}))

vi.mock('@modelcontextprotocol/sdk/client', () => {
  return {
    Client: class MockClient {
      connect = mockConnect
      close = vi.fn()
      listTools = vi.fn()
      callTool = vi.fn()
    },
  }
})

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp', () => ({
  StreamableHTTPClientTransport: vi.fn(),
}))

import { getMcpClient, resetMcpClient } from './client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp'

describe('MCP Client', () => {
  const savedEnv = process.env.WORKER_MCP_URL

  beforeEach(() => {
    vi.clearAllMocks()
    resetMcpClient()
    delete process.env.WORKER_MCP_URL
  })

  afterEach(() => {
    if (savedEnv !== undefined) {
      process.env.WORKER_MCP_URL = savedEnv
    } else {
      delete process.env.WORKER_MCP_URL
    }
  })

  it('returns same client instance on repeated calls (singleton)', async () => {
    const client1 = await getMcpClient()
    const client2 = await getMcpClient()
    expect(client1).toBe(client2)
    expect(mockConnect).toHaveBeenCalledTimes(1)
  })

  it('creates transport with WORKER_MCP_URL env var', async () => {
    process.env.WORKER_MCP_URL = 'http://custom-worker:4000/mcp'
    await getMcpClient()
    expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
      new URL('http://custom-worker:4000/mcp')
    )
  })

  it('uses default URL when env var not set', async () => {
    delete process.env.WORKER_MCP_URL
    await getMcpClient()
    expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(
      new URL('http://worker:3001/mcp')
    )
  })

  it('resetMcpClient clears singleton so next call creates new client', async () => {
    const client1 = await getMcpClient()
    resetMcpClient()
    const client2 = await getMcpClient()
    expect(client1).not.toBe(client2)
    expect(mockConnect).toHaveBeenCalledTimes(2)
  })

  it('sets mcpClient to null and throws on connection failure', async () => {
    mockConnect.mockRejectedValueOnce(new Error('connection refused'))
    await expect(getMcpClient()).rejects.toThrow(
      'Failed to connect to MCP server'
    )
  })
})
