import type { LanguageModel } from 'ai'

export class AIProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`AI provider "${provider}" is not configured. Add its API key to the environment.`)
    this.name = 'AIProviderNotConfiguredError'
  }
}

export interface AIProviderAdapter {
  readonly provider: string
  getModel(modelName: string): LanguageModel
}
