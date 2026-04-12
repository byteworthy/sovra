import { describe, it, expect, beforeEach, vi } from 'vitest'

// Use dynamic import to reset module state between tests
let registryModule: typeof import('@/lib/ai/registry')

describe('AI Provider Registry', () => {
  beforeEach(async () => {
    // Re-import to reset the registry Map each time
    vi.resetModules()
    registryModule = await import('@/lib/ai/registry')
  })

  it('getProvider returns openai adapter after initProviders', () => {
    registryModule.initProviders()
    const adapter = registryModule.getProvider('openai')
    expect(adapter.provider).toBe('openai')
  })

  it('getProvider returns anthropic adapter after initProviders', () => {
    registryModule.initProviders()
    const adapter = registryModule.getProvider('anthropic')
    expect(adapter.provider).toBe('anthropic')
  })

  it('getProvider throws for unknown provider', () => {
    registryModule.initProviders()
    expect(() => registryModule.getProvider('unknown')).toThrow(
      'Unknown provider: unknown'
    )
  })

  it('initProviders is idempotent', () => {
    registryModule.initProviders()
    registryModule.initProviders()
    const adapter = registryModule.getProvider('openai')
    expect(adapter.provider).toBe('openai')
  })

  it('registerProvider adds a custom adapter', () => {
    const custom = { provider: 'custom', getModel: () => ({}) as any }
    registryModule.registerProvider(custom)
    const result = registryModule.getProvider('custom')
    expect(result.provider).toBe('custom')
  })
})
