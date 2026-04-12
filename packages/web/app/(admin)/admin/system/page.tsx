import { HealthCheckRow } from '@/components/admin/HealthCheckRow'

export default function SystemHealthPage() {
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">System health</h1>

      <div>
        <p className="text-sm font-semibold mb-3">Services</p>
        <div className="bg-card border border-border rounded-xl divide-y divide-border/50 px-4">
          <HealthCheckRow name="API server" status="healthy" latencyMs={12} lastChecked={now} />
          <HealthCheckRow name="Database" status="healthy" latencyMs={4} lastChecked={now} />
          <HealthCheckRow name="Go worker" status="healthy" lastChecked={now} />
          <HealthCheckRow name="Redis / Upstash" status="healthy" latencyMs={2} lastChecked={now} />
          <HealthCheckRow name="Sentry" status="healthy" lastChecked={now} />
          <HealthCheckRow name="PostHog" status="healthy" lastChecked={now} />
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3">Custom metrics</p>
        <p className="text-sm text-muted-foreground">
          PostHog metrics will appear here once monitoring integration is wired in Plan 05.
        </p>
      </div>
    </div>
  )
}
