'use client'

import { useState } from 'react'
import { TenantTable } from '@/components/admin/TenantTable'
import type { AdminTenant } from '@/lib/admin/queries'

interface TenantTableWrapperProps {
  tenants: AdminTenant[]
  total: number
  initialPage: number
  pageSize: number
}

export function TenantTableWrapper({ tenants, total, initialPage, pageSize }: TenantTableWrapperProps) {
  const [page, setPage] = useState(initialPage)

  return (
    <TenantTable
      tenants={tenants}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
    />
  )
}
