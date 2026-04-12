import type { CoreMessage } from 'ai'
import type { MemoryStrategy } from '@/lib/workspace/types'

export interface MemoryBuildParams {
  workspaceId: string
  agentId: string
  prompt: string
  strategy: MemoryStrategy
}

/**
 * Builds context messages for an agent turn based on the workspace memory strategy.
 * Full strategy implementations live in conversation.ts / summary.ts / vector.ts / hybrid.ts
 * (plan 05-03). This stub returns a basic user message so agents can run before 05-03 lands.
 */
export async function buildContextMessages(
  params: MemoryBuildParams
): Promise<CoreMessage[]> {
  return [{ role: 'user', content: params.prompt }]
}
