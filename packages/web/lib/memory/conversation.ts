import type { CoreMessage, MemoryBuildParams } from './types'

export async function buildConversationMemory(params: MemoryBuildParams): Promise<CoreMessage[]> {
  const { supabase, conversationId, tenantId, systemPrompt } = params

  const { data, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch conversation messages: ${error.message}`)
  }

  const messages: CoreMessage[] = (data ?? []).map((row: { role: string; content: string }) => ({
    role: row.role as CoreMessage['role'],
    content: row.content,
  }))

  if (systemPrompt) {
    return [{ role: 'system', content: systemPrompt }, ...messages]
  }

  return messages
}
