import { createAnthropic } from '@ai-sdk/anthropic'
import { AIProviderNotConfiguredError, type AIProviderAdapter } from './adapter'

export class AnthropicAdapter implements AIProviderAdapter {
  readonly provider = 'anthropic'
  private client: ReturnType<typeof createAnthropic>
  private readonly apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.ANTHROPIC_API_KEY ?? ''
    this.client = createAnthropic({ apiKey: this.apiKey })
  }

  getModel(modelName: string) {
    if (!this.apiKey) {
      throw new AIProviderNotConfiguredError(this.provider)
    }
    return this.client(modelName)
  }
}
