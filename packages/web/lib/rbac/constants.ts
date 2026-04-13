export const DEFAULT_ROLES = ['owner', 'admin', 'member', 'viewer'] as const
export type DefaultRole = (typeof DEFAULT_ROLES)[number]

export const DEFAULT_PERMISSIONS = [
  'agent:create',
  'agent:read',
  'agent:update',
  'agent:delete',
  'workspace:create',
  'workspace:read',
  'workspace:update',
  'workspace:delete',
  'workspace:manage',
  'tenant:manage',
  'tenant:invite',
  'billing:read',
  'billing:manage',
  'member:read',
  'member:manage',
] as const

// Routes that don't require authentication
export const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/callback',
  '/invite',
  '/',
  '/docs',
] as const

// Routes that don't require tenant context
export const TENANT_FREE_ROUTES = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/callback',
  '/invite',
  '/onboarding',
  '/',
  '/docs',
] as const
