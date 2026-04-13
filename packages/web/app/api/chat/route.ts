import { streamText, type CoreTool } from 'ai'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { getProvider, initProviders } from '@/lib/ai/registry'
import { getMcpClient } from '@/lib/mcp/client'
import { buildAiToolsFromMcp, getAgentTools } from '@/lib/mcp/tool-registry'
import { getChatLimiter, checkSessionRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import type { Json } from '@byteswarm/shared/types/database'

const TOOL_COSTS: Record<string, number> = {
  web_search: 0.001,
  web_fetch: 0.0001,
  file_read: 0,
  file_write: 0,
  file_list: 0,
  semantic_search: 0.0001,
  database_query: 0.0001,
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const rl = await checkSessionRateLimit(getChatLimiter(), user.id)
  if (!rl.success) return rateLimitResponse(rl.retryAfter!)

  const { messages, agentId, conversationId } = await req.json()

  if (!agentId || !messages?.length) {
    return new Response('Bad request: agentId and messages required', {
      status: 400,
    })
  }

  if (!conversationId) {
    return new Response('Bad request: conversationId required', { status: 400 })
  }

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (!agent) return new Response('Agent not found', { status: 404 })

  // Verify user belongs to agent's tenant
  const { data: membership } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', agent.tenant_id)
    .single()

  if (!membership) return new Response('Forbidden', { status: 403 })

  await supabase.from('agents').update({ status: 'running' }).eq('id', agentId)

  initProviders()
  const adapter = getProvider(agent.model_provider)
  const model = adapter.getModel(agent.model_name)

  // Load MCP tools with graceful degradation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let agentTools: Record<string, CoreTool<any, any>> = {}
  try {
    const mcpClient = await getMcpClient()
    const allTools = await buildAiToolsFromMcp(mcpClient)
    agentTools = getAgentTools(allTools, (agent.tools as string[]) ?? []) as
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Record<string, CoreTool<any, any>>
  } catch {
    console.warn('MCP client unavailable, streaming without tools')
  }

  const hasTools = Object.keys(agentTools).length > 0

  try {
    const result = await streamText({
      model,
      system: agent.system_prompt ?? undefined,
      messages,
      tools: hasTools ? agentTools : undefined,
      maxSteps: 10,
      temperature: Number(agent.temperature) || 0.7,
      maxTokens: agent.max_tokens ?? 4096,
      onFinish: async ({ steps }: { steps: Array<{
        toolCalls?: Array<{ toolCallId: string; toolName: string; args: unknown }>;
        toolResults?: Array<{ toolCallId: string; result: unknown }>;
      }> }) => {
        await supabase
          .from('agents')
          .update({ status: 'idle' })
          .eq('id', agentId)

        for (const step of steps) {
          for (const toolCall of step.toolCalls ?? []) {
            const toolResult = step.toolResults?.find(
              (r) => r.toolCallId === toolCall.toolCallId
            )
            await supabase.from('tool_executions').insert({
              tenant_id: agent.tenant_id,
              agent_id: agentId,
              conversation_id: conversationId,
              tool_name: toolCall.toolName,
              input: toolCall.args as Json,
              output: (toolResult?.result ?? null) as Json,
              status: toolResult ? 'success' : 'error',
              error_message: toolResult
                ? null
                : 'Tool call did not produce a result',
              cost_usd: TOOL_COSTS[toolCall.toolName] ?? 0,
              completed_at: new Date().toISOString(),
            })
          }
        }
      },
    })

    return result.toDataStreamResponse()
  } catch (error) {
    await supabase
      .from('agents')
      .update({ status: 'error' })
      .eq('id', agentId)
    const message = error instanceof Error ? error.message : 'Stream failed'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
