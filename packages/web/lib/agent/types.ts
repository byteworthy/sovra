import { z } from 'zod'

export const SUPPORTED_PROVIDERS = ['openai', 'anthropic', 'huggingface'] as const
export type SupportedProvider = (typeof SUPPORTED_PROVIDERS)[number]

export const PROVIDER_MODELS: Record<SupportedProvider, readonly string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  huggingface: [
    'openai/gpt-oss-120b',
    'deepseek-ai/DeepSeek-R1',
    'Qwen/Qwen2.5-72B-Instruct',
    'meta-llama/Meta-Llama-3.1-8B-Instruct',
    'mistralai/Mistral-7B-Instruct-v0.3',
  ],
} as const

export const agentFormSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  system_prompt: z.string().max(10000).optional(),
  model_provider: z.enum(SUPPORTED_PROVIDERS),
  model_name: z.string().min(1),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().int().min(1).max(128000),
  tools: z.array(z.string()).default([]),
})

export type AgentFormData = z.infer<typeof agentFormSchema>

export const AVAILABLE_TOOLS = [
  'web_search',
  'web_fetch',
  'file_read',
  'file_write',
  'file_list',
  'semantic_search',
] as const
