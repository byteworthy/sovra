import { streamText } from 'ai'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { getProvider, initProviders } from '@/lib/ai/registry'

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

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

  await supabase.from('agents').update({ status: 'running' }).eq('id', agentId)

  initProviders()
  const adapter = getProvider(agent.model_provider)
  const model = adapter.getModel(agent.model_name)

  try {
    const result = await streamText({
      model,
      system: agent.system_prompt ?? undefined,
      messages,
      temperature: Number(agent.temperature) || 0.7,
      maxTokens: agent.max_tokens ?? 4096,
      onFinish: async () => {
        await supabase
          .from('agents')
          .update({ status: 'idle' })
          .eq('id', agentId)
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
