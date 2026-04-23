import { beforeEach, describe, expect, it, vi } from 'vitest'

const { modelFactory, createOpenAI } = vi.hoisted(() => {
  const modelFactory = vi.fn()
  const createOpenAI = vi.fn(() => modelFactory)
  return { modelFactory, createOpenAI }
})

vi.mock('@ai-sdk/openai', () => ({ createOpenAI }))

import { HuggingFaceAdapter } from '@/lib/ai/huggingface-adapter'
import { AIProviderNotConfiguredError } from '@/lib/ai/adapter'

describe('HuggingFaceAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.HUGGINGFACE_BASE_URL
    delete process.env.HUGGINGFACE_ROUTING_POLICY
  })

  it('uses the Hugging Face router URL by default', () => {
    new HuggingFaceAdapter('hf_test')

    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://router.huggingface.co/v1',
        apiKey: 'hf_test',
      })
    )
  })

  it('supports custom Hugging Face base URL override', () => {
    process.env.HUGGINGFACE_BASE_URL = 'https://example.com/v1'
    new HuggingFaceAdapter('hf_test')

    expect(createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'https://example.com/v1',
      })
    )
  })

  it('appends routing policy when model has no suffix', () => {
    process.env.HUGGINGFACE_ROUTING_POLICY = 'cheapest'
    const adapter = new HuggingFaceAdapter('hf_test')

    adapter.getModel('deepseek-ai/DeepSeek-R1')

    expect(modelFactory).toHaveBeenCalledWith('deepseek-ai/DeepSeek-R1:cheapest')
  })

  it('keeps explicit model suffix unchanged', () => {
    process.env.HUGGINGFACE_ROUTING_POLICY = 'fastest'
    const adapter = new HuggingFaceAdapter('hf_test')

    adapter.getModel('openai/gpt-oss-120b:sambanova')

    expect(modelFactory).toHaveBeenCalledWith('openai/gpt-oss-120b:sambanova')
  })

  it('throws when Hugging Face API key is missing', () => {
    const adapter = new HuggingFaceAdapter('')
    expect(() => adapter.getModel('deepseek-ai/DeepSeek-R1')).toThrow(AIProviderNotConfiguredError)
  })
})
