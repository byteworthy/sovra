export interface AgentResponse {
  agentId: string
  text: string
  role: 'leader' | 'member'
}

export type ConflictResolutionMode = 'vote' | 'hierarchy' | 'consensus'

export function resolveByVote(responses: AgentResponse[]): AgentResponse {
  if (responses.length === 0) throw new Error('No responses to resolve')

  const counts = new Map<string, { count: number; response: AgentResponse }>()
  for (const r of responses) {
    const existing = counts.get(r.text)
    if (existing) {
      existing.count++
    } else {
      counts.set(r.text, { count: 1, response: r })
    }
  }

  let winner = responses[0]
  let maxCount = 0
  for (const { count, response } of counts.values()) {
    if (count > maxCount) {
      maxCount = count
      winner = response
    }
  }
  return winner
}

export function resolveByHierarchy(responses: AgentResponse[]): AgentResponse {
  if (responses.length === 0) throw new Error('No responses to resolve')
  const leader = responses.find((r) => r.role === 'leader')
  return leader ?? responses[0]
}

export function resolveByConsensus(responses: AgentResponse[]): AgentResponse {
  if (responses.length === 0) throw new Error('No responses to resolve')
  const unique = new Set(responses.map((r) => r.text))
  if (unique.size === 1) return responses[0]
  return resolveByVote(responses)
}

export function resolveConflict(
  mode: ConflictResolutionMode,
  responses: AgentResponse[]
): AgentResponse {
  switch (mode) {
    case 'vote':
      return resolveByVote(responses)
    case 'hierarchy':
      return resolveByHierarchy(responses)
    case 'consensus':
      return resolveByConsensus(responses)
    default:
      return resolveByVote(responses)
  }
}
