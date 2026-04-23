function resolveWorkerBroadcastBaseUrl(): URL {
  const baseUrl =
    process.env.WORKER_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_WORKER_URL ||
    process.env.NEXT_PUBLIC_WORKER_SOCKET_URL

  if (!baseUrl) {
    throw new Error(
      'Worker broadcast URL is not configured. Set WORKER_INTERNAL_URL or NEXT_PUBLIC_WORKER_URL.'
    )
  }

  let parsed: URL
  try {
    parsed = new URL(baseUrl)
  } catch {
    throw new Error(`Invalid worker broadcast URL: ${baseUrl}`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported worker broadcast protocol: ${parsed.protocol}`)
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, '')
  parsed.search = ''
  parsed.hash = ''
  return parsed
}

function buildWorkerBroadcastEndpoint(workerBaseUrl: URL): string {
  const base = new URL(workerBaseUrl.toString())
  if (!base.pathname.endsWith('/')) {
    base.pathname = `${base.pathname}/`
  }

  return new URL('internal/broadcast', base).toString()
}

export async function broadcastToWorkspace(
  tenantId: string,
  workspaceId: string,
  event: string,
  data: unknown
): Promise<void> {
  const workerBaseUrl = resolveWorkerBroadcastBaseUrl()
  const endpoint = buildWorkerBroadcastEndpoint(workerBaseUrl)
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
