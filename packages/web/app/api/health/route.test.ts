import { afterEach, describe, expect, it } from 'vitest'
import { GET } from './route'

const ORIGINAL_ENV = { ...process.env }

describe('GET /api/health', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('returns ok when core runtime config is present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.WORKER_INTERNAL_URL = 'http://worker.internal'
    process.env.OPENAI_API_KEY = 'sk-test'
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.HUGGINGFACE_API_KEY

    const res = GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.checks.supabase).toBe('configured')
    expect(body.checks.worker).toBe('configured')
    expect(body.checks.ai_providers.configured_count).toBe(1)
  })

  it('returns degraded when AI provider keys are missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.NEXT_PUBLIC_WORKER_URL = 'http://localhost:3002'
    delete process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.HUGGINGFACE_API_KEY

    const res = GET()
    const body = await res.json()

    expect(body.status).toBe('degraded')
    expect(body.checks.ai_providers).toEqual({
      configured_count: 0,
      status: 'missing_config',
    })
  })

  it('returns degraded when Supabase config is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    process.env.WORKER_INTERNAL_URL = 'http://worker.internal'
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test'

    const res = GET()
    const body = await res.json()

    expect(body.status).toBe('degraded')
    expect(body.checks.supabase).toBe('missing_config')
  })
})
