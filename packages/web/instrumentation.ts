import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')

    // Validate environment variables at startup — fail fast in production
    const { validateEnv } = await import('@/lib/env')
    try {
      validateEnv()
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error
      }
      console.warn('[env] Validation warnings (non-fatal in development):', error)
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
