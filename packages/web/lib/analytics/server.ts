import { PostHog } from 'posthog-node'

/**
 * Captures a server-side PostHog event with immediate flush.
 *
 * Uses flushAt:1 + flushInterval:0 + await shutdown() because Next.js
 * serverless functions terminate before async background flushes complete.
 * One PostHog client per call is intentional — serverless has no long-lived process.
 */
export async function captureEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const key = process.env.POSTHOG_KEY
  if (!key) return

  const client = new PostHog(key, {
    host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })

  client.capture({ distinctId, event, properties })
  await client.shutdown()
}
