import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { TenantProvider, useTenant } from '@/lib/tenant/context'
import type { Tenant } from '@sovra/shared'

const mockTenant: Tenant = {
  id: 'test-id',
  slug: 'acme',
  name: 'Acme Inc',
  plan: 'free',
  settings: {},
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function wrapper({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line react/no-children-prop
  return React.createElement(TenantProvider, { tenant: mockTenant, children })
}

describe('TenantProvider + useTenant', () => {
  it('renders children with tenant context', () => {
    const { result } = renderHook(() => useTenant(), { wrapper })
    expect(result.current).toBeDefined()
  })

  it('useTenant returns tenant slug correctly', () => {
    const { result } = renderHook(() => useTenant(), { wrapper })
    expect(result.current.tenantSlug).toBe('acme')
  })

  it('useTenant returns tenant id correctly', () => {
    const { result } = renderHook(() => useTenant(), { wrapper })
    expect(result.current.tenantId).toBe('test-id')
  })

  it('useTenant returns full tenant object', () => {
    const { result } = renderHook(() => useTenant(), { wrapper })
    expect(result.current.tenant).toEqual(mockTenant)
  })

  it('useTenant throws error when used outside TenantProvider', () => {
    expect(() => renderHook(() => useTenant())).toThrow(
      'useTenant must be used within a TenantProvider'
    )
  })
})
