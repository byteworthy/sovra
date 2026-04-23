import { createOpenAI } from '@ai-sdk/openai'
import { AIProviderNotConfiguredError, type AIProviderAdapter } from './adapter'

// Hugging Face Inference Providers expose an OpenAI-compatible endpoint.
const HF_DEFAULT_BASE_URL = 'https://router.huggingface.co/v1'

function withRoutingPolicy(modelName: string): string {
  const policy = process.env.HUGGINGFACE_ROUTING_POLICY?.trim()
  if (!policy) return modelName
  if (modelName.includes(':')) return modelName
  return `${modelName}:${policy}`
}

export class HuggingFaceAdapter implements AIProviderAdapter {
  readonly provider = 'huggingface'
  private client: ReturnType<typeof createOpenAI>
  private readonly apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.HUGGINGFACE_API_KEY ?? ''
    this.client = createOpenAI({
      baseURL: process.env.HUGGINGFACE_BASE_URL ?? HF_DEFAULT_BASE_URL,
      apiKey: this.apiKey,
    })
  }

  getModel(modelName: string) {
    if (!this.apiKey) {
      throw new AIProviderNotConfiguredError(this.provider)
    }
    return this.client(withRoutingPolicy(modelName))
  }
}
