'use server'

import { createSupabaseServerClient } from '@/lib/auth/server'

interface ConversationInput {
  tenantId: string
  agentId: string
  title?: string
}

interface ConversationResult {
  conversation: Record<string, unknown> | null
  error: string | null
}

interface MessageInput {
  conversationId: string
  tenantId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
}

interface MessageResult {
  message: Record<string, unknown> | null
  error: string | null
}

interface DeleteResult {
  error: string | null
}

export async function createConversation(
  input: ConversationInput
): Promise<ConversationResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { conversation: null, error: 'Not authenticated' }

  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert({
      tenant_id: input.tenantId,
      agent_id: input.agentId,
      user_id: user.id,
      title: input.title ?? null,
    })
    .select('*')
    .single()

  if (error) return { conversation: null, error: error.message }
  return { conversation, error: null }
}

export async function deleteConversation(
  conversationId: string
): Promise<DeleteResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)

  if (error) return { error: error.message }
  return { error: null }
}

export async function saveMessage(
  input: MessageInput
): Promise<MessageResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: null, error: 'Not authenticated' }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: input.conversationId,
      tenant_id: input.tenantId,
      role: input.role,
      content: input.content,
    })
    .select('*')
    .single()

  if (error) return { message: null, error: error.message }
  return { message, error: null }
}
