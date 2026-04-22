import { describe, expect, it } from 'vitest'
import {
  appendNextParam,
  buildAuthCallbackUrl,
  sanitizeRedirectPath,
} from '@/lib/auth/redirect'

describe('auth redirect helpers', () => {
  it('returns fallback for invalid redirect paths', () => {
    expect(sanitizeRedirectPath(undefined)).toBe('/onboarding')
    expect(sanitizeRedirectPath('https://evil.example')).toBe('/onboarding')
    expect(sanitizeRedirectPath('//evil.example')).toBe('/onboarding')
  })

  it('keeps valid relative redirect paths', () => {
    expect(sanitizeRedirectPath('/t/acme/dashboard')).toBe('/t/acme/dashboard')
    expect(sanitizeRedirectPath('/t/acme/dashboard?tab=usage')).toBe(
      '/t/acme/dashboard?tab=usage'
    )
  })

  it('appends sanitized next param to auth links', () => {
    expect(appendNextParam('/auth/login', '/t/acme/dashboard')).toBe(
      '/auth/login?next=%2Ft%2Facme%2Fdashboard'
    )
    expect(appendNextParam('/auth/login', 'https://evil.example')).toBe(
      '/auth/login?next=%2Fonboarding'
    )
  })

  it('builds callback URLs with safe next paths', () => {
    expect(buildAuthCallbackUrl('https://app.example.com', '/t/acme/agents')).toBe(
      'https://app.example.com/auth/callback?next=%2Ft%2Facme%2Fagents'
    )
    expect(buildAuthCallbackUrl('https://app.example.com', 'https://evil.example')).toBe(
      'https://app.example.com/auth/callback?next=%2Fonboarding'
    )
  })
})

