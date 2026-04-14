import type { Metadata } from 'next'
import { getAllTenants } from '@/lib/admin/queries'
import { TenantTableWrapper } from './TenantTableWrapper'

export const metadata: Metadata = {
  title: 'Tenants | Sovra Admin',
  description: 'View, search, and manage all tenant organizations on the platform.',
}

interface TenantsPageProps {
  searchParams: Promise<{ page?: string; search?: string }>
}

export default async function TenantsPage({ searchParams }: TenantsPageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const pageSize = 20

  let data: Awaited<ReturnType<typeof getAllTenants>> = { data: [], total: 0 }

  try {
    data = await getAllTenants(page, pageSize)
  } catch {
    // Renders empty state on DB error
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Tenants</h1>
        <button className="h-8 px-3 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          + Create tenant
        </button>
      </div>

      <TenantTableWrapper
        tenants={data.data}
        total={data.total}
        initialPage={page}
        pageSize={pageSize}
      />
    </div>
  )
}
