import type { LanguageModel } from 'ai'
import type { CoreMessage } from './types'

const CHARS_PER_TOKEN = 4

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/** Keeps all system messages plus the last `maxMessages` non-system messages. */
export function snipMessages(messages: CoreMessage[], maxMessages: number): CoreMessage[] {
  const systemMessages = messages.filter((m) => m.role === 'system')
  const conversationMessages = messages.filter((m) => m.role !== 'system')

  if (conversationMessages.length <= maxMessages) {
    return messages
  }

  const recentMessages = conversationMessages.slice(-maxMessages)
  return [...systemMessages, ...recentMessages]
}

/** Keeps only the last `keepLast` messages, discarding everything else. */
export function collapseMessages(messages: CoreMessage[], keepLast: number): CoreMessage[] {
  if (keepLast === 0) return []
  if (messages.length <= keepLast) return messages
  return messages.slice(-keepLast)
}

type GenerateTextFn = (params: {
  model: LanguageModel
  messages: CoreMessage[]
}) => Promise<{ text: string }>

/**
 * Summarizes older messages into a single system message, keeping the last `keepLast` messages intact.
 * If no older messages exist, returns messages unchanged.
 */
export async function microcompactMessages(
  model: LanguageModel,
  messages: CoreMessage[],
  keepLast: number,
  generateText: GenerateTextFn
): Promise<CoreMessage[]> {
  const nonSystemMessages = messages.filter((m) => m.role !== 'system')

  if (nonSystemMessages.length <= keepLast) {
    return messages
  }

  const olderMessages = nonSystemMessages.slice(0, -keepLast)
  const recentMessages = nonSystemMessages.slice(-keepLast)

  const { text: summaryText } = await generateText({
    model,
    messages: [
      {
        role: 'user',
        content: `Summarize this conversation in under 200 words, preserving key decisions and facts.\n\n${olderMessages.map((m) => `${m.role}: ${m.content}`).join('\n')}`,
      },
    ],
  })

  const summaryMessage: CoreMessage = {
    role: 'system',
    content: summaryText,
  }

  return [summaryMessage, ...recentMessages]
}
