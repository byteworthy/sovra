import type { AIProviderAdapter } from './adapter'
import { OpenAIAdapter } from './openai-adapter'
import { AnthropicAdapter } from './anthropic-adapter'
import { HuggingFaceAdapter } from './huggingface-adapter'

const registry = new Map<string, AIProviderAdapter>()

export function registerProvider(adapter: AIProviderAdapter): void {
  registry.set(adapter.provider, adapter)
}

export function getProvider(name: string): AIProviderAdapter {
  const adapter = registry.get(name)
  if (!adapter) throw new Error(`Unknown provider: ${name}`)
  return adapter
}

export function initProviders(): void {
  if (registry.size > 0) return
  registerProvider(new OpenAIAdapter())
  registerProvider(new AnthropicAdapter())
  registerProvider(new HuggingFaceAdapter())
}
