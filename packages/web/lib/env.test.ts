import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateEnv } from './env'

const ORIGINAL_ENV = { ...process.env }

function setBaseEnv() {
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  }
}

describe('validateEnv', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.restoreAllMocks()
  })

  it('accepts base required environment variables', () => {
    setBaseEnv()
    expect(() => validateEnv()).not.toThrow()
  })

  it('rejects invalid worker URL values', () => {
    setBaseEnv()
    process.env.WORKER_INTERNAL_URL = 'not-a-url'

    expect(() => validateEnv()).toThrow('Invalid environment variables. See errors above.')
  })

  it('rejects invalid Hugging Face routing policy values', () => {
    setBaseEnv()
    process.env.HUGGINGFACE_ROUTING_POLICY = 'fastest policy'

    expect(() => validateEnv()).toThrow('Invalid environment variables. See errors above.')
  })

  it('accepts valid Hugging Face and worker config values', () => {
    setBaseEnv()
    process.env.HUGGINGFACE_API_KEY = 'hf_test_token'
    process.env.HUGGINGFACE_BASE_URL = 'https://router.huggingface.co/v1'
    process.env.HUGGINGFACE_ROUTING_POLICY = 'fastest'
    process.env.WORKER_INTERNAL_URL = 'http://localhost:3002'
    process.env.WORKER_MCP_URL = 'http://localhost:3001/mcp'
    process.env.WORKER_HEALTH_URL = 'http://localhost:8080'

    expect(() => validateEnv()).not.toThrow()
  })
})
