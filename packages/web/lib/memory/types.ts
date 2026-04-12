import type { SupabaseClient } from '@supabase/supabase-js'
import type { LanguageModel } from 'ai'

export type CoreMessage = { role: 'system' | 'user' | 'assistant'; content: string }

export interface MemoryBuildParams {
  supabase: SupabaseClient
  conversationId: string
  tenantId: string
  workspaceId?: string
  strategy: 'conversation' | 'summary' | 'vector' | 'hybrid'
  maxTokenBudget: number
  currentPrompt: string
  systemPrompt?: string
  model?: LanguageModel
}

export async function buildContextMessages(params: MemoryBuildParams): Promise<CoreMessage[]> {
  switch (params.strategy) {
    case 'conversation':
      return (await import('./conversation')).buildConversationMemory(params)
    case 'summary':
      return (await import('./summary')).buildSummaryMemory(params)
    case 'vector':
      return (await import('./vector')).buildVectorMemory(params)
    case 'hybrid':
      return (await import('./hybrid')).buildHybridMemory(params)
  }
}
