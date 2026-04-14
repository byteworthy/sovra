import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/admin/service-client'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Guard 1: verify authenticated session
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Guard 2: verify is_platform_admin via service-role client (bypasses RLS)
  const adminClient = createAdminClient()
  const { data: userRow } = await adminClient
    .from('users')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!userRow?.is_platform_admin) redirect('/onboarding')

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-14 flex items-center justify-between px-6 border-b border-amber-500/20 bg-background sticky top-0 z-10">
          <span className="text-sm font-semibold text-amber-400">Sovra Admin</span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <Link
              href="/onboarding"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Exit admin
            </Link>
          </div>
        </header>
        <main id="main-content" className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
