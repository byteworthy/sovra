import { generateText } from 'ai'
import type { CoreMessage, MemoryBuildParams } from './types'

const SUMMARY_KEEP_RECENT = 4
const SUMMARY_PROMPT =
  'Summarize this conversation in under 200 words, preserving key decisions and facts.'

export async function buildSummaryMemory(params: MemoryBuildParams): Promise<CoreMessage[]> {
  const { supabase, conversationId, tenantId, systemPrompt, model } = params

  const { data, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch messages for summary: ${error.message}`)
  }

  const allMessages: CoreMessage[] = (data ?? []).map((row: { role: string; content: string }) => ({
    role: row.role as CoreMessage['role'],
    content: row.content,
  }))

  const result: CoreMessage[] = []

  if (systemPrompt) {
    result.push({ role: 'system', content: systemPrompt })
  }

  if (allMessages.length <= SUMMARY_KEEP_RECENT || !model) {
    return [...result, ...allMessages]
  }

  const olderMessages = allMessages.slice(0, -SUMMARY_KEEP_RECENT)
  const recentMessages = allMessages.slice(-SUMMARY_KEEP_RECENT)

  const conversationText = olderMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')

  const { text: summaryText } = await generateText({
    model,
    messages: [
      {
        role: 'user' as const,
        content: `${SUMMARY_PROMPT}\n\n${conversationText}`,
      },
    ],
  })

  result.push({ role: 'system', content: summaryText })
  result.push(...recentMessages)

  return result
}
