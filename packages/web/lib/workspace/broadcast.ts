const WORKER_URL =
  process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:3002'

export async function broadcastToWorkspace(
  tenantId: string,
  workspaceId: string,
  event: string,
  data: unknown
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const secret = process.env.INTERNAL_API_SECRET
  if (secret) {
    headers['Authorization'] = `Bearer ${secret}`
  }

  await fetch(`${WORKER_URL}/internal/broadcast`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tenant_id: tenantId,
      workspace_id: workspaceId,
      event,
      data,
    }),
  })
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
