import * as Sentry from '@sentry/nextjs'

// Only initialize if DSN is provided — self-hosters may omit this
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    // Low sample rates: open-source project users control their own Sentry quotas
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  })
}
