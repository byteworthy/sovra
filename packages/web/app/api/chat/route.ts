import { convertToModelMessages, streamText, type ToolSet, type UIMessage } from 'ai'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { AIProviderNotConfiguredError } from '@/lib/ai/adapter'
import { getProvider, initProviders } from '@/lib/ai/registry'
import { getMcpClient } from '@/lib/mcp/client'
import { buildAiToolsFromMcp, getAgentTools } from '@/lib/mcp/tool-registry'
import { getChatLimiter, checkSessionRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import type { Json } from '@sovra/shared/types/database'

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

  const { messages: rawMessages, agentId, conversationId } = await req.json()

  if (!agentId || !Array.isArray(rawMessages) || rawMessages.length === 0) {
    return new Response('Bad request: agentId and messages required', {
      status: 400,
    })
  }

  if (!conversationId) {
    return new Response('Bad request: conversationId required', { status: 400 })
  }

  const messages: UIMessage[] = rawMessages.map((message: unknown) => {
    const value = message as {
      id?: string
      role?: UIMessage['role']
      parts?: UIMessage['parts']
      content?: string
    }

    const parts: UIMessage['parts'] = Array.isArray(value.parts)
      ? value.parts
      : [{ type: 'text', text: value.content ?? '' }]

    return {
      id: value.id ?? crypto.randomUUID(),
      role: value.role ?? 'user',
      parts,
    }
  })

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
  let model
  try {
    const adapter = getProvider(agent.model_provider)
    model = adapter.getModel(agent.model_name)
  } catch (error) {
    const isKnownProviderIssue =
      error instanceof AIProviderNotConfiguredError ||
      (error instanceof Error && error.message.startsWith('Unknown provider:'))
    if (!isKnownProviderIssue) {
      return new Response(
        JSON.stringify({ error: 'An error occurred while resolving the AI provider.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return new Response(
      JSON.stringify({ error: `AI provider "${agent.model_provider}" is not configured. Check your API keys.` }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Load MCP tools with graceful degradation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let agentTools: ToolSet = {}
  try {
    const mcpClient = await getMcpClient()
    const allTools = await buildAiToolsFromMcp(mcpClient)
    agentTools = getAgentTools(allTools, (agent.tools as string[]) ?? []) as ToolSet
  } catch (mcpError) {
    console.warn('MCP client unavailable, streaming without tools:', mcpError instanceof Error ? mcpError.message : mcpError)
  }

  const hasTools = Object.keys(agentTools).length > 0

  try {
    const result = await streamText({
      model,
      system: agent.system_prompt ?? undefined,
      messages: convertToModelMessages(
        messages.map(({ id: _id, ...rest }) => rest),
        hasTools ? { tools: agentTools } : undefined
      ),
      tools: hasTools ? agentTools : undefined,
      temperature: Number(agent.temperature) || 0.7,
      maxOutputTokens: agent.max_tokens ?? 4096,
      onFinish: async ({ steps }) => {
        await supabase
          .from('agents')
          .update({ status: 'idle' })
          .eq('id', agentId)

        for (const step of steps) {
          const toolCalls = (step.toolCalls ?? []) as Array<{
            toolCallId: string
            toolName: string
            input?: unknown
          }>
          const toolResults = (step.toolResults ?? []) as Array<{
            toolCallId: string
            output?: unknown
          }>

          for (const toolCall of toolCalls) {
            const toolResult = toolResults.find(
              (r) => r.toolCallId === toolCall.toolCallId
            )
            await supabase.from('tool_executions').insert({
              tenant_id: agent.tenant_id,
              agent_id: agentId,
              conversation_id: conversationId,
              tool_name: toolCall.toolName,
              input: (toolCall.input ?? null) as Json,
              output: (toolResult?.output ?? null) as Json,
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

    return result.toUIMessageStreamResponse()
  } catch (error) {
    await supabase
      .from('agents')
      .update({ status: 'error' })
      .eq('id', agentId)
    const rawMessage = error instanceof Error ? error.message : 'Stream failed'
    // Sanitize: don't leak provider URLs or API key details to client
    const isMissingKey = rawMessage.includes('401') || rawMessage.includes('Unauthorized') || rawMessage.includes('API key')
    const message = isMissingKey
      ? `AI provider not configured. Add the API key for "${agent.model_provider}" to your environment.`
      : 'An error occurred while streaming the response.'
    console.error('Chat stream error:', rawMessage)
    return new Response(JSON.stringify({ error: message }), {
      status: isMissingKey ? 503 : 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
