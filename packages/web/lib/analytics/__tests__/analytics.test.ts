import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Sentry mock ──────────────────────────────────────────────────────────────
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  captureRequestError: vi.fn(),
}))

// ─── posthog-node mock ────────────────────────────────────────────────────────
const mockCapture = vi.fn()
const mockShutdown = vi.fn().mockResolvedValue(undefined)

vi.mock('posthog-node', () => {
  const MockPostHog = vi.fn(function (this: unknown) {
    Object.assign(this as object, { capture: mockCapture, shutdown: mockShutdown })
  })
  return { PostHog: MockPostHog }
})

// ─── Sentry config tests ──────────────────────────────────────────────────────
describe('Sentry client config', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('calls Sentry.init when NEXT_PUBLIC_SENTRY_DSN is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://key@sentry.io/123')
    const Sentry = await import('@sentry/nextjs')
    await import('../../../sentry.client.config')
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://key@sentry.io/123' }),
    )
    vi.unstubAllEnvs()
  })

  it('does not throw when NEXT_PUBLIC_SENTRY_DSN is absent', async () => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '')
    await expect(import('../../../sentry.client.config')).resolves.not.toThrow()
    vi.unstubAllEnvs()
  })
})

describe('instrumentation module', () => {
  it('exports register function', async () => {
    const instrumentation = await import('../../../instrumentation')
    expect(typeof instrumentation.register).toBe('function')
  })

  it('exports onRequestError', async () => {
    const instrumentation = await import('../../../instrumentation')
    expect(instrumentation.onRequestError).toBeDefined()
  })
})

// ─── PostHog server tests ─────────────────────────────────────────────────────
describe('captureEvent', () => {
  beforeEach(() => {
    vi.resetModules()
    mockCapture.mockClear()
    mockShutdown.mockClear()
  })

  it('creates PostHog client with flushAt:1 and flushInterval:0', async () => {
    vi.stubEnv('POSTHOG_KEY', 'phc_test_key')
    vi.stubEnv('POSTHOG_HOST', 'https://us.i.posthog.com')
    const PostHog = (await import('posthog-node')).PostHog as unknown as ReturnType<typeof vi.fn>
    const { captureEvent } = await import('../server')
    await captureEvent('user-1', 'test_event')
    expect(PostHog).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({ flushAt: 1, flushInterval: 0 }),
    )
    vi.unstubAllEnvs()
  })

  it('calls client.capture with correct params', async () => {
    vi.stubEnv('POSTHOG_KEY', 'phc_test_key')
    const { captureEvent } = await import('../server')
    await captureEvent('user-1', 'test_event', { key: 'value' })
    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: 'user-1',
        event: 'test_event',
        properties: { key: 'value' },
      }),
    )
    vi.unstubAllEnvs()
  })

  it('calls client.shutdown()', async () => {
    vi.stubEnv('POSTHOG_KEY', 'phc_test_key')
    const { captureEvent } = await import('../server')
    await captureEvent('user-1', 'test_event')
    expect(mockShutdown).toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('does not throw when POSTHOG_KEY is absent', async () => {
    vi.stubEnv('POSTHOG_KEY', '')
    const { captureEvent } = await import('../server')
    await expect(captureEvent('user-1', 'test_event')).resolves.not.toThrow()
    vi.unstubAllEnvs()
  })
})

// ─── EVENTS catalog tests ─────────────────────────────────────────────────────
describe('EVENTS catalog', () => {
  it('has all required event keys', async () => {
    const { EVENTS } = await import('../events')
    expect(EVENTS).toHaveProperty('agent_execution')
    expect(EVENTS).toHaveProperty('tool_usage')
    expect(EVENTS).toHaveProperty('workspace_run')
    expect(EVENTS).toHaveProperty('api_key_created')
    expect(EVENTS).toHaveProperty('subscription_changed')
  })
})
