'use server'

import { createSupabaseServerClient } from '@/lib/auth/server'
import type { Tables } from '@sovra/shared/types/database'

interface ConversationInput {
  tenantId: string
  agentId: string
  title?: string
}

interface ConversationResult {
  conversation: Tables<'conversations'> | null
  error: string | null
}

interface MessageInput {
  conversationId: string
  tenantId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
}

interface MessageResult {
  message: Tables<'messages'> | null
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

  // Verify tenant membership before creating conversation
  const { data: membership } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', input.tenantId)
    .single()

  if (!membership) return { conversation: null, error: 'Forbidden' }

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

  // Verify ownership: conversation must belong to a tenant the user is a member of
  const { data: conversation } = await supabase
    .from('conversations')
    .select('tenant_id')
    .eq('id', conversationId)
    .single()

  if (!conversation) return { error: 'Conversation not found' }

  const { data: membership } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', conversation.tenant_id)
    .single()

  if (!membership) return { error: 'Forbidden' }

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('tenant_id', conversation.tenant_id)

  if (error) return { error: error.message }
  return { error: null }
}

export async function saveMessage(
  input: MessageInput
): Promise<MessageResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: null, error: 'Not authenticated' }

  // Verify tenant membership before saving message
  const { data: membership } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', input.tenantId)
    .single()

  if (!membership) return { message: null, error: 'Forbidden' }

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
