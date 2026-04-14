import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/admin/service-client'
import { HealthCheckRow } from '@/components/admin/HealthCheckRow'

export const metadata: Metadata = {
  title: 'System Health | Sovra Admin',
  description: 'Monitor real-time system health, service status, and infrastructure metrics.',
}

type HealthStatus = 'healthy' | 'degraded' | 'down'

interface CheckResult {
  name: string
  status: HealthStatus
  latencyMs?: number
}

async function checkApi(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      signal: AbortSignal.timeout(5000),
    })
    return { name: 'API server', status: res.ok ? 'healthy' : 'degraded', latencyMs: Date.now() - start }
  } catch {
    return { name: 'API server', status: 'down', latencyMs: Date.now() - start }
  }
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now()
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient.from('tenants').select('id').limit(1)
    return { name: 'Database', status: error ? 'degraded' : 'healthy', latencyMs: Date.now() - start }
  } catch {
    return { name: 'Database', status: 'down', latencyMs: Date.now() - start }
  }
}

async function checkWorker(): Promise<CheckResult> {
  const start = Date.now()
  const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8080'
  try {
    const res = await fetch(`${workerUrl}/health`, { signal: AbortSignal.timeout(5000) })
    return { name: 'Go worker', status: res.ok ? 'healthy' : 'degraded', latencyMs: Date.now() - start }
  } catch {
    return { name: 'Go worker', status: 'down', latencyMs: Date.now() - start }
  }
}

async function checkRedis(): Promise<CheckResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  if (!url) return { name: 'Redis / Upstash', status: 'down' }
  const start = Date.now()
  try {
    const res = await fetch(`${url}/ping`, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN ?? ''}` },
      signal: AbortSignal.timeout(5000),
    })
    return { name: 'Redis / Upstash', status: res.ok ? 'healthy' : 'degraded', latencyMs: Date.now() - start }
  } catch {
    return { name: 'Redis / Upstash', status: 'down', latencyMs: Date.now() - start }
  }
}

export default async function SystemHealthPage() {
  const checks = await Promise.all([
    checkApi(),
    checkDatabase(),
    checkWorker(),
    checkRedis(),
  ])

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">System health</h1>

      <div>
        <p className="text-sm font-semibold mb-3">Services</p>
        <div className="bg-card border border-border rounded-xl divide-y divide-border/50 px-4">
          {checks.map((check) => (
            <HealthCheckRow
              key={check.name}
              name={check.name}
              status={check.status}
              latencyMs={check.latencyMs}
              lastChecked={now}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3">Custom metrics</p>
        <p className="text-sm text-muted-foreground">
          Custom metrics will appear here once PostHog dashboards are configured.
        </p>
      </div>
    </div>
  )
}
