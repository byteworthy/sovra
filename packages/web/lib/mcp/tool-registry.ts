import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import type { Client } from '@modelcontextprotocol/sdk/client'

type JsonSchemaProperty = {
  type?: string
}

function convertJsonSchemaToZod(
  inputSchema?: { properties?: Record<string, JsonSchemaProperty>; required?: string[] }
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  if (!inputSchema?.properties) return z.object({})

  const shape: Record<string, z.ZodTypeAny> = {}
  const required = new Set(inputSchema.required ?? [])

  for (const [key, prop] of Object.entries(inputSchema.properties)) {
    let fieldSchema: z.ZodTypeAny

    switch (prop.type) {
      case 'number':
      case 'integer':
        fieldSchema = z.number()
        break
      case 'boolean':
        fieldSchema = z.boolean()
        break
      case 'array':
        fieldSchema = z.array(z.any())
        break
      default:
        fieldSchema = z.string()
    }

    shape[key] = required.has(key) ? fieldSchema : fieldSchema.optional()
  }

  return z.object(shape)
}

type AiTool = ToolSet[string]

export async function buildAiToolsFromMcp(
  client: Client
): Promise<Record<string, AiTool>> {
  const { tools: mcpTools } = await client.listTools()

  const entries = mcpTools.map((t) => [
    t.name,
    tool({
      description: t.description ?? '',
      inputSchema: convertJsonSchemaToZod(
        t.inputSchema as { properties?: Record<string, JsonSchemaProperty>; required?: string[] }
      ),
      execute: async (args: unknown) => {
        const result = await client.callTool(
          { name: t.name, arguments: args as Record<string, unknown> },
          undefined,
          { signal: AbortSignal.timeout(30000) }
        )
        return result.content
      },
    }),
  ])

  return Object.fromEntries(entries) as Record<string, AiTool>
}

export function getAgentTools(
  allTools: Record<string, unknown>,
  agentToolNames: string[]
): ToolSet {
  return Object.fromEntries(
    agentToolNames
      .map((name) => [name, allTools[name]])
      .filter(([, v]) => v != null)
  ) as ToolSet
}
