import type { TenantResolver } from '@sovra/shared'

export class SubdomainTenantResolver implements TenantResolver {
  resolve(request: { url: string; headers: { get(name: string): string | null } }): string | null {
    const host = request.headers.get('host') ?? new URL(request.url).host
    // Strip port if present
    const hostname = host.split(':')[0]
    // Reject localhost and IPs (no dots or single-label)
    const parts = hostname.split('.')
    // Need at least 3 parts: subdomain.domain.tld
    if (parts.length < 3) return null
    const subdomain = parts[0]
    // Reject empty or numeric-only subdomains (IPs)
    if (!subdomain || /^\d+$/.test(subdomain)) return null
    return subdomain
  }
}
