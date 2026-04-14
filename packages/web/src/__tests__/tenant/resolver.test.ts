import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PathTenantResolver } from '@/lib/tenant/path-resolver'
import { SubdomainTenantResolver } from '@/lib/tenant/subdomain-resolver'
import { HeaderTenantResolver } from '@/lib/tenant/header-resolver'
import { createTenantResolver } from '@/lib/tenant/resolver'

function makeRequest(url: string, headers: Record<string, string> = {}) {
  return {
    url,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  }
}

describe('PathTenantResolver', () => {
  const resolver = new PathTenantResolver()

  it('extracts slug from /t/acme/dashboard', () => {
    expect(resolver.resolve(makeRequest('http://localhost/t/acme/dashboard'))).toBe('acme')
  })

  it('returns null for /login (no tenant path)', () => {
    expect(resolver.resolve(makeRequest('http://localhost/login'))).toBeNull()
  })

  it('extracts slug from /t/my-org (no trailing path)', () => {
    expect(resolver.resolve(makeRequest('http://localhost/t/my-org'))).toBe('my-org')
  })
})

describe('SubdomainTenantResolver', () => {
  const resolver = new SubdomainTenantResolver()

  it('extracts slug from host acme.sovra.dev', () => {
    expect(resolver.resolve(makeRequest('https://acme.sovra.dev/', { host: 'acme.sovra.dev' }))).toBe('acme')
  })

  it('returns null for sovra.dev (no subdomain)', () => {
    expect(resolver.resolve(makeRequest('https://sovra.dev/', { host: 'sovra.dev' }))).toBeNull()
  })

  it('returns null for localhost:3000', () => {
    expect(resolver.resolve(makeRequest('http://localhost:3000/', { host: 'localhost:3000' }))).toBeNull()
  })
})

describe('HeaderTenantResolver', () => {
  const resolver = new HeaderTenantResolver()

  it('extracts slug from X-Tenant-Slug header', () => {
    expect(resolver.resolve(makeRequest('http://localhost/', { 'x-tenant-slug': 'acme' }))).toBe('acme')
  })

  it('extracts slug from X-Tenant-ID header when X-Tenant-Slug absent', () => {
    expect(resolver.resolve(makeRequest('http://localhost/', { 'x-tenant-id': 'uuid-123' }))).toBe('uuid-123')
  })

  it('returns null when no tenant header present', () => {
    expect(resolver.resolve(makeRequest('http://localhost/'))).toBeNull()
  })
})

describe('createTenantResolver', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    delete process.env.TENANT_RESOLUTION_STRATEGY
  })

  it('returns PathTenantResolver by default', () => {
    const resolver = createTenantResolver()
    expect(resolver).toBeInstanceOf(PathTenantResolver)
  })

  it('returns SubdomainTenantResolver when strategy is subdomain', () => {
    const resolver = createTenantResolver('subdomain')
    expect(resolver).toBeInstanceOf(SubdomainTenantResolver)
  })

  it('returns PathTenantResolver when strategy is path', () => {
    const resolver = createTenantResolver('path')
    expect(resolver).toBeInstanceOf(PathTenantResolver)
  })

  it('returns HeaderTenantResolver when strategy is header', () => {
    const resolver = createTenantResolver('header')
    expect(resolver).toBeInstanceOf(HeaderTenantResolver)
  })

  it('returns SubdomainTenantResolver when TENANT_RESOLUTION_STRATEGY env is subdomain', () => {
    process.env.TENANT_RESOLUTION_STRATEGY = 'subdomain'
    const resolver = createTenantResolver()
    expect(resolver).toBeInstanceOf(SubdomainTenantResolver)
  })
})
