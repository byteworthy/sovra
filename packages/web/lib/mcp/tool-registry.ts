import { tool } from 'ai'
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

export async function buildAiToolsFromMcp(
  client: Client
): Promise<Record<string, ReturnType<typeof tool>>> {
  const { tools: mcpTools } = await client.listTools()

  return Object.fromEntries(
    mcpTools.map((t) => [
      t.name,
      tool({
        description: t.description ?? '',
        parameters: convertJsonSchemaToZod(
          t.inputSchema as { properties?: Record<string, JsonSchemaProperty>; required?: string[] }
        ),
        execute: async (args) => {
          const result = await client.callTool(
            { name: t.name, arguments: args as Record<string, unknown> },
            { signal: AbortSignal.timeout(30000) }
          )
          return result.content
        },
      }),
    ])
  )
}

export function getAgentTools(
  allTools: Record<string, unknown>,
  agentToolNames: string[]
): Record<string, unknown> {
  return Object.fromEntries(
    agentToolNames
      .map((name) => [name, allTools[name]])
      .filter(([, v]) => v != null)
  )
}
