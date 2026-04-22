const DEFAULT_WORKER_BROADCAST_URL = 'http://localhost:3002'

function resolveWorkerBroadcastBaseUrl(): string {
  const baseUrl =
    process.env.WORKER_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_WORKER_URL ||
    DEFAULT_WORKER_BROADCAST_URL

  return baseUrl.replace(/\/+$/, '')
}

export async function broadcastToWorkspace(
  tenantId: string,
  workspaceId: string,
  event: string,
  data: unknown
): Promise<void> {
  const workerBaseUrl = resolveWorkerBroadcastBaseUrl()
  const endpoint = `${workerBaseUrl}/internal/broadcast`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const secret = process.env.INTERNAL_API_SECRET
  if (secret) {
    headers['Authorization'] = `Bearer ${secret}`
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tenant_id: tenantId,
        workspace_id: workspaceId,
        event,
        data,
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Worker broadcast request failed for "${event}" at ${endpoint}: ${message}`
    )
  }

  if (!response.ok) {
    let errorBody = ''
    try {
      errorBody = await response.text()
    } catch {
      errorBody = ''
    }

    const detail = errorBody ? ` - ${errorBody}` : ''
    throw new Error(
      `Worker broadcast failed (${response.status} ${response.statusText}) for "${event}" at ${endpoint}${detail}`
    )
  }
}

export async function broadcastAgentStatus(
  tenantId: string,
  workspaceId: string,
  agentId: string,
  status: string
): Promise<void> {
  await broadcastToWorkspace(tenantId, workspaceId, 'agent:status', {
    agentId,
    status,
  })
}

export async function broadcastAgentMessage(
  tenantId: string,
  workspaceId: string,
  agentId: string,
  message: string,
  targetAgentId?: string
): Promise<void> {
  await broadcastToWorkspace(tenantId, workspaceId, 'agent:message', {
    agentId,
    message,
    targetAgentId,
  })
}

export async function broadcastAgentChunk(
  tenantId: string,
  workspaceId: string,
  agentId: string,
  chunk: string
): Promise<void> {
  await broadcastToWorkspace(tenantId, workspaceId, 'agent:chunk', {
    agentId,
    chunk,
  })
}

export async function broadcastAgentDone(
  tenantId: string,
  workspaceId: string,
  agentId: string
): Promise<void> {
  await broadcastToWorkspace(tenantId, workspaceId, 'agent:done', { agentId })
}
