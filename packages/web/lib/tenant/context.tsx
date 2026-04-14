'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Tenant } from '@sovra/shared'

interface TenantContextValue {
  tenant: Tenant
  tenantId: string
  tenantSlug: string
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({ tenant, children }: { tenant: Tenant; children: ReactNode }) {
  return (
    <TenantContext.Provider value={{ tenant, tenantId: tenant.id, tenantSlug: tenant.slug }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant(): TenantContextValue {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
