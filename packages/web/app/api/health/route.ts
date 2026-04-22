type HealthState = 'ok' | 'degraded'

const AI_PROVIDER_VARS = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'HUGGINGFACE_API_KEY'] as const

function isConfigured(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

export function GET(): Response {
  const providerCount = AI_PROVIDER_VARS.filter((name) => isConfigured(process.env[name])).length
  const workerConfigured =
    isConfigured(process.env.WORKER_INTERNAL_URL) || isConfigured(process.env.NEXT_PUBLIC_WORKER_URL)
  const supabaseConfigured =
    isConfigured(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isConfigured(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  const status: HealthState =
    providerCount > 0 && workerConfigured && supabaseConfigured ? 'ok' : 'degraded'

  return Response.json({
    status,
    timestamp: new Date().toISOString(),
    checks: {
      supabase: supabaseConfigured ? 'configured' : 'missing_config',
      worker: workerConfigured ? 'configured' : 'missing_config',
      ai_providers: {
        configured_count: providerCount,
        status: providerCount > 0 ? 'configured' : 'missing_config',
      },
    },
  })
}
