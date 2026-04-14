import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { TenantProvider } from '@/lib/tenant/context'
import { ToastProvider } from '@/components/ui/toast-provider'
import { Sidebar, MobileSidebar } from '@/components/tenant/sidebar'
import type { Tenant } from '@sovra/shared'

interface TenantLayoutProps {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()

  const { data: row, error } = await supabase
    .from('tenants')
    .select('id, name, slug, plan, settings, created_at, updated_at')
    .eq('slug', slug)
    .single()

  if (error || !row) notFound()

  const tenant: Tenant = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan ?? 'free',
    settings: (typeof row.settings === 'object' && row.settings !== null && !Array.isArray(row.settings) ? row.settings : {}) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

  return (
    <TenantProvider tenant={tenant}>
      <ToastProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen">
            {/* Sticky header */}
            <header className="h-14 sticky top-0 z-10 flex items-center justify-between px-6 shadow-[0_1px_0_hsl(var(--border))] backdrop-blur-sm bg-background/80">
              <div className="flex items-center gap-3">
                <MobileSidebar />
                <span className="text-sm font-semibold">Dashboard</span>
              </div>
            </header>

            {/* Page content */}
            <main id="main-content" className="p-6 max-w-5xl flex-1">{children}</main>
          </div>
        </div>
      </ToastProvider>
    </TenantProvider>
  )
}
