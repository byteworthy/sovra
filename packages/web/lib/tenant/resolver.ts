import type { TenantResolver, TenantResolutionStrategy } from '@sovra/shared'
import { PathTenantResolver } from './path-resolver'
import { SubdomainTenantResolver } from './subdomain-resolver'
import { HeaderTenantResolver } from './header-resolver'

export function createTenantResolver(strategy?: TenantResolutionStrategy): TenantResolver {
  const resolved = strategy ?? (process.env.TENANT_RESOLUTION_STRATEGY as TenantResolutionStrategy) ?? 'path'
  switch (resolved) {
    case 'subdomain': return new SubdomainTenantResolver()
    case 'header': return new HeaderTenantResolver()
    case 'path':
    default: return new PathTenantResolver()
  }
}

export type { TenantResolver }
