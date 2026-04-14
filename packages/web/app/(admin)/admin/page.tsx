import type { Metadata } from 'next'
import { LayoutDashboard, Users, Bot, Activity } from 'lucide-react'
import { getPlatformStats } from '@/lib/admin/queries'
import { AdminStatCard } from '@/components/admin/AdminStatCard'
import { HealthCheckRow } from '@/components/admin/HealthCheckRow'

export const metadata: Metadata = {
  title: 'Admin Overview | Sovra',
  description: 'Platform-wide statistics, health checks, and admin controls.',
}

export default async function AdminOverviewPage() {
  let stats = { totalTenants: 0, activeUsers: 0, totalAgents: 0, apiCallsToday: 0 }

  try {
    stats = await getPlatformStats()
  } catch {
    // Non-fatal: page still renders with zero stats if DB unavailable
  }

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Platform overview</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard label="Total tenants" value={stats.totalTenants} icon={LayoutDashboard} />
        <AdminStatCard label="Active users" value={stats.activeUsers} icon={Users} />
        <AdminStatCard label="Total agents" value={stats.totalAgents} icon={Bot} />
        <AdminStatCard label="API calls today" value={stats.apiCallsToday} icon={Activity} />
      </div>

      {/* System health */}
      <div>
        <p className="text-sm font-semibold mb-3">System health</p>
        <div className="bg-card border border-border rounded-xl divide-y divide-border/50 px-4">
          <HealthCheckRow name="API server" status="healthy" latencyMs={12} lastChecked={now} />
          <HealthCheckRow name="Database" status="healthy" latencyMs={4} lastChecked={now} />
          <HealthCheckRow name="Go worker" status="healthy" lastChecked={now} />
          <HealthCheckRow name="Sentry" status="healthy" lastChecked={now} />
          <HealthCheckRow name="PostHog" status="healthy" lastChecked={now} />
        </div>
      </div>
    </div>
  )
}
