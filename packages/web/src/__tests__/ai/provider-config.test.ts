import { beforeEach, describe, expect, it, vi } from 'vitest'

const { openaiFactory, anthropicFactory, createOpenAI, createAnthropic } = vi.hoisted(() => {
  const openaiFactory = vi.fn()
  const anthropicFactory = vi.fn()
  const createOpenAI = vi.fn(() => openaiFactory)
  const createAnthropic = vi.fn(() => anthropicFactory)
  return { openaiFactory, anthropicFactory, createOpenAI, createAnthropic }
})

vi.mock('@ai-sdk/openai', () => ({ createOpenAI }))
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic }))

import { AIProviderNotConfiguredError } from '@/lib/ai/adapter'
import { OpenAIAdapter } from '@/lib/ai/openai-adapter'
import { AnthropicAdapter } from '@/lib/ai/anthropic-adapter'

describe('AI provider adapter configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
  })

  it('throws a configuration error when OpenAI key is missing', () => {
    const adapter = new OpenAIAdapter()
    expect(() => adapter.getModel('gpt-4o')).toThrow(AIProviderNotConfiguredError)
  })

  it('throws a configuration error when Anthropic key is missing', () => {
    const adapter = new AnthropicAdapter()
    expect(() => adapter.getModel('claude-sonnet-4-6')).toThrow(AIProviderNotConfiguredError)
  })

  it('returns OpenAI model when key is provided', () => {
    const adapter = new OpenAIAdapter('sk-test')
    adapter.getModel('gpt-4o')
    expect(openaiFactory).toHaveBeenCalledWith('gpt-4o')
  })

  it('returns Anthropic model when key is provided', () => {
    const adapter = new AnthropicAdapter('sk-ant-test')
    adapter.getModel('claude-sonnet-4-6')
    expect(anthropicFactory).toHaveBeenCalledWith('claude-sonnet-4-6')
  })
})
