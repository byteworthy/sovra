import { createOpenAI } from '@ai-sdk/openai'
import { AIProviderNotConfiguredError, type AIProviderAdapter } from './adapter'

export class OpenAIAdapter implements AIProviderAdapter {
  readonly provider = 'openai'
  private client: ReturnType<typeof createOpenAI>
  private readonly apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? ''
    this.client = createOpenAI({ apiKey: this.apiKey })
  }

  getModel(modelName: string) {
    if (!this.apiKey) {
      throw new AIProviderNotConfiguredError(this.provider)
    }
    return this.client(modelName)
  }
}
