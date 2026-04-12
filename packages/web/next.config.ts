import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@byteswarm/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Required for Sentry distributed tracing in Next.js 15
    clientTraceMetadata: ['sentry-trace', 'baggage'],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Suppress source map upload output when not in CI
  silent: !process.env.CI,
  // Disable automatic releases — let the CI pipeline manage this
  autoInstrumentServerFunctions: false,
})
