import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp'

let mcpClient: Client | null = null

export async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient

  const url = new URL(process.env.WORKER_MCP_URL ?? 'http://worker:3001/mcp')
  const client = new Client({ name: 'byteswarm-web', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(url)

  try {
    await client.connect(transport)
  } catch (err) {
    mcpClient = null
    throw new Error(
      `Failed to connect to MCP server at ${url}: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  mcpClient = client
  return client
}

export function resetMcpClient(): void {
  mcpClient = null
}
