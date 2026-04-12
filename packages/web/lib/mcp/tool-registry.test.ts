import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Client } from '@modelcontextprotocol/sdk/client'

describe('Tool Registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('buildAiToolsFromMcp', () => {
    it('converts MCP tool list to Record of ai tool objects', async () => {
      const { buildAiToolsFromMcp } = await import('./tool-registry')

      const mockClient = {
        listTools: vi.fn().mockResolvedValue({
          tools: [
            {
              name: 'web_search',
              description: 'Search the web',
              inputSchema: {
                type: 'object',
                properties: { query: { type: 'string' } },
                required: ['query'],
              },
            },
            {
              name: 'file_read',
              description: 'Read a file',
              inputSchema: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  maxLines: { type: 'number' },
                },
                required: ['path'],
              },
            },
          ],
        }),
        callTool: vi.fn(),
      } as unknown as Client

      const tools = await buildAiToolsFromMcp(mockClient)

      expect(Object.keys(tools)).toEqual(['web_search', 'file_read'])
      expect(tools.web_search).toBeDefined()
      expect(tools.file_read).toBeDefined()
    })

    it('execute function calls client.callTool with tool name and args', async () => {
      const { buildAiToolsFromMcp } = await import('./tool-registry')

      const mockCallTool = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'result data' }],
      })

      const mockClient = {
        listTools: vi.fn().mockResolvedValue({
          tools: [
            {
              name: 'web_search',
              description: 'Search the web',
              inputSchema: {
                type: 'object',
                properties: { query: { type: 'string' } },
                required: ['query'],
              },
            },
          ],
        }),
        callTool: mockCallTool,
      } as unknown as Client

      const tools = await buildAiToolsFromMcp(mockClient)

      // Access the execute function from the tool
      // The ai tool() returns an object with execute
      const toolDef = tools.web_search as { execute: (args: Record<string, unknown>) => Promise<unknown> }
      const result = await toolDef.execute({ query: 'test' })

      expect(mockCallTool).toHaveBeenCalledWith(
        { name: 'web_search', arguments: { query: 'test' } },
        expect.objectContaining({})
      )
      expect(result).toEqual([{ type: 'text', text: 'result data' }])
    })

    it('execute includes AbortSignal.timeout(30000)', async () => {
      const { buildAiToolsFromMcp } = await import('./tool-registry')

      const mockCallTool = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
      })

      const mockClient = {
        listTools: vi.fn().mockResolvedValue({
          tools: [
            {
              name: 'file_read',
              description: 'Read file',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
        }),
        callTool: mockCallTool,
      } as unknown as Client

      const tools = await buildAiToolsFromMcp(mockClient)
      const toolDef = tools.file_read as { execute: (args: Record<string, unknown>) => Promise<unknown> }
      await toolDef.execute({})

      // Verify callTool was called with an options object containing signal
      const callArgs = mockCallTool.mock.calls[0]
      expect(callArgs[1]).toBeDefined()
      expect(callArgs[1].signal).toBeInstanceOf(AbortSignal)
    })

    it('handles tools with no inputSchema', async () => {
      const { buildAiToolsFromMcp } = await import('./tool-registry')

      const mockClient = {
        listTools: vi.fn().mockResolvedValue({
          tools: [
            {
              name: 'simple_tool',
              description: 'No params needed',
            },
          ],
        }),
        callTool: vi.fn().mockResolvedValue({ content: [] }),
      } as unknown as Client

      const tools = await buildAiToolsFromMcp(mockClient)
      expect(tools.simple_tool).toBeDefined()
    })

    it('handles boolean and array types in schema', async () => {
      const { buildAiToolsFromMcp } = await import('./tool-registry')

      const mockClient = {
        listTools: vi.fn().mockResolvedValue({
          tools: [
            {
              name: 'complex_tool',
              description: 'Complex params',
              inputSchema: {
                type: 'object',
                properties: {
                  flag: { type: 'boolean' },
                  items: { type: 'array' },
                  count: { type: 'integer' },
                },
                required: ['flag'],
              },
            },
          ],
        }),
        callTool: vi.fn().mockResolvedValue({ content: [] }),
      } as unknown as Client

      const tools = await buildAiToolsFromMcp(mockClient)
      expect(tools.complex_tool).toBeDefined()
    })
  })

  describe('getAgentTools', () => {
    it('filters tools to only those in agent.tools array', async () => {
      const { getAgentTools } = await import('./tool-registry')

      const allTools = {
        web_search: { name: 'web_search' },
        file_read: { name: 'file_read' },
        file_write: { name: 'file_write' },
        semantic_search: { name: 'semantic_search' },
      }

      const filtered = getAgentTools(allTools, ['web_search', 'semantic_search'])

      expect(Object.keys(filtered)).toEqual(['web_search', 'semantic_search'])
      expect(filtered.web_search).toBe(allTools.web_search)
      expect(filtered.semantic_search).toBe(allTools.semantic_search)
    })

    it('skips tool names not found in allTools', async () => {
      const { getAgentTools } = await import('./tool-registry')

      const allTools = {
        web_search: { name: 'web_search' },
      }

      const filtered = getAgentTools(allTools, [
        'web_search',
        'nonexistent_tool',
      ])

      expect(Object.keys(filtered)).toEqual(['web_search'])
    })

    it('returns empty object when no tools match', async () => {
      const { getAgentTools } = await import('./tool-registry')
      const filtered = getAgentTools({}, ['web_search'])
      expect(filtered).toEqual({})
    })
  })
})
