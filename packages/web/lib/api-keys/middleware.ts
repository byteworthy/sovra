import type { NextRequest } from 'next/server'
import { authenticateApiKey } from './authenticator'
import { checkRateLimit } from './rate-limiter'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ApiKeyContext {
  tenantId: string
  permissions: string[]
  keyPrefix: string
}

type ApiKeyHandler = (request: Request, context: ApiKeyContext) => Promise<Response>

function createServiceClient(): Pick<SupabaseClient, 'from'> {
  // Lazily import to avoid Next.js server-only guard issues in tests
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createServerClient } = require('@supabase/ssr') as typeof import('@supabase/ssr')
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}

export function withApiKeyAuth(
  handler: ApiKeyHandler,
  supabaseFactory?: () => Pick<SupabaseClient, 'from'>
) {
  return async (request: Request | NextRequest): Promise<Response> => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const rawKey = authHeader.slice('Bearer '.length).trim()

    const supabase = supabaseFactory ? supabaseFactory() : createServiceClient()
    const authResult = await authenticateApiKey(supabase, rawKey)

    if (!authResult.valid) {
      return new Response(JSON.stringify({ error: 'Invalid or expired API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const keyPrefix = rawKey.slice(0, 12)
    const rateResult = await checkRateLimit(keyPrefix)

    if (!rateResult.success) {
      const resetSeconds = rateResult.reset
        ? Math.ceil((rateResult.reset - Date.now()) / 1000)
        : 60

      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(resetSeconds),
        },
      })
    }

    const context: ApiKeyContext = {
      tenantId: authResult.tenantId,
      permissions: authResult.permissions,
      keyPrefix,
    }

    return handler(request, context)
  }
}
