import { describe, it, expect } from 'vitest'
import { agentFormSchema, SUPPORTED_PROVIDERS, PROVIDER_MODELS } from '@/lib/agent/types'

const validData = {
  name: 'Test Agent',
  model_provider: 'openai' as const,
  model_name: 'gpt-4o',
  temperature: 0.7,
  max_tokens: 4096,
  tools: [],
}

describe('agentFormSchema', () => {
  it('parses valid agent data', () => {
    const result = agentFormSchema.parse(validData)
    expect(result.name).toBe('Test Agent')
    expect(result.model_provider).toBe('openai')
  })

  it('rejects empty name', () => {
    expect(() =>
      agentFormSchema.parse({ ...validData, name: '' })
    ).toThrow()
  })

  it('rejects temperature above 2', () => {
    expect(() =>
      agentFormSchema.parse({ ...validData, temperature: 3.0 })
    ).toThrow()
  })

  it('rejects max_tokens of 0', () => {
    expect(() =>
      agentFormSchema.parse({ ...validData, max_tokens: 0 })
    ).toThrow()
  })

  it('rejects unknown provider', () => {
    expect(() =>
      agentFormSchema.parse({ ...validData, model_provider: 'unknown' })
    ).toThrow()
  })

  it('allows optional description and system_prompt', () => {
    const result = agentFormSchema.parse({
      ...validData,
      description: 'A test agent',
      system_prompt: 'You are helpful.',
    })
    expect(result.description).toBe('A test agent')
    expect(result.system_prompt).toBe('You are helpful.')
  })

  it('defaults tools to empty array', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tools: _tools, ...withoutTools } = validData
    const result = agentFormSchema.parse(withoutTools)
    expect(result.tools).toEqual([])
  })
})

describe('PROVIDER_MODELS', () => {
  it('openai includes gpt-4o and gpt-4o-mini', () => {
    expect(PROVIDER_MODELS.openai).toContain('gpt-4o')
    expect(PROVIDER_MODELS.openai).toContain('gpt-4o-mini')
  })

  it('anthropic includes claude-sonnet-4-6', () => {
    expect(PROVIDER_MODELS.anthropic).toContain('claude-sonnet-4-6')
  })

  it('huggingface includes openai/gpt-oss-120b', () => {
    expect(PROVIDER_MODELS.huggingface).toContain('openai/gpt-oss-120b')
  })
})

describe('SUPPORTED_PROVIDERS', () => {
  it('includes openai, anthropic, and huggingface', () => {
    expect(SUPPORTED_PROVIDERS).toContain('openai')
    expect(SUPPORTED_PROVIDERS).toContain('anthropic')
    expect(SUPPORTED_PROVIDERS).toContain('huggingface')
  })
})
