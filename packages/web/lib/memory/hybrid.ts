import { buildSummaryMemory } from './summary'
import { buildVectorMemory } from './vector'
import type { CoreMessage, MemoryBuildParams } from './types'

export async function buildHybridMemory(params: MemoryBuildParams): Promise<CoreMessage[]> {
  const [summaryMessages, vectorMessages] = await Promise.all([
    buildSummaryMemory(params),
    buildVectorMemory(params),
  ])

  // Separate system messages (summary + vector context) from conversation messages
  const summarySystemMessages = summaryMessages.filter((m) => m.role === 'system')
  const vectorSystemMessages = vectorMessages.filter((m) => m.role === 'system')
  const vectorConversationMessages = vectorMessages.filter((m) => m.role !== 'system')

  // Deduplicate conversation messages by content+role identity
  const seenConversation = new Set<string>()
  const deduplicatedConversation: CoreMessage[] = []

  for (const msg of vectorConversationMessages) {
    const key = `${msg.role}:${msg.content}`
    if (!seenConversation.has(key)) {
      seenConversation.add(key)
      deduplicatedConversation.push(msg)
    }
  }

  // Order: summary system messages first, then vector context, then conversation messages
  return [...summarySystemMessages, ...vectorSystemMessages, ...deduplicatedConversation]
}
