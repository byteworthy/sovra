import type { TenantResolver } from '@sovra/shared'

// Matches /t/{slug} or /t/{slug}/... where slug is [a-z0-9-]+
const PATH_PATTERN = /^\/t\/([a-z0-9-]+)/

export class PathTenantResolver implements TenantResolver {
  resolve(request: { url: string; headers: { get(name: string): string | null } }): string | null {
    const pathname = new URL(request.url).pathname
    const match = PATH_PATTERN.exec(pathname)
    return match ? match[1] : null
  }
}
