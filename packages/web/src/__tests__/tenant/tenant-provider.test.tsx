import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import React from 'react'
import { TenantProvider, useTenant } from '@/lib/tenant/context'
import type { Tenant } from '@sovra/shared'

const mockTenant: Tenant = {
  id: 'tenant-123',
  slug: 'test-workspace',
  name: 'Test Workspace',
  plan: 'free',
  settings: {},
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

function wrapper({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line react/no-children-prop
  return React.createElement(TenantProvider, { tenant: mockTenant, children })
}

describe('TenantProvider render', () => {
  it('renders children within provider', () => {
    render(
      <TenantProvider tenant={mockTenant}>
        <div data-testid="child">Hello</div>
      </TenantProvider>
    )
    expect(screen.getByTestId('child')).toBeDefined()
    expect(screen.getByTestId('child').textContent).toBe('Hello')
  })

  it('useTenant returns tenant data within provider', () => {
    const { result } = renderHook(() => useTenant(), { wrapper })
    expect(result.current.tenant).toEqual(mockTenant)
    expect(result.current.tenantId).toBe('tenant-123')
    expect(result.current.tenantSlug).toBe('test-workspace')
  })

  it('useTenant throws outside provider', () => {
    expect(() => {
      renderHook(() => useTenant())
    }).toThrow('useTenant must be used within a TenantProvider')
  })
})
