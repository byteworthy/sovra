import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { getSubscriptionForTenant, getUsageForTenant } from '@/lib/billing/actions'
import { getPlanLimits } from '@/lib/billing/plans'
import type { PlanId } from '@/lib/billing/plans'
import { PlanCard } from '@/components/billing/PlanCard'
import { UsageMetricRow } from '@/components/billing/UsageMetricRow'
import { BillingPortalButton } from '@/components/billing/BillingPortalButton'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Billing | Sovra',
  description: 'Manage your subscription plan, usage limits, and billing details.',
}

interface BillingPageProps {
  params: Promise<{ slug: string }>
}

export default async function BillingPage({ params }: BillingPageProps) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('id, plan')
    .eq('slug', slug)
    .single()

  if (!tenantRow) notFound()

  const tenantId = tenantRow.id
  const currentPlan = (tenantRow.plan ?? 'free') as PlanId

  const [subscription, usage] = await Promise.all([
    getSubscriptionForTenant(supabase, tenantId),
    getUsageForTenant(supabase, tenantId),
  ])

  const limits = getPlanLimits(currentPlan)
  const allPlans: PlanId[] = ['free', 'pro', 'enterprise']

  const storageMbUsed = (subscription?.storage_mb_used as number) ?? 0

  return (
    <div className="max-w-3xl p-6">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and usage.</p>
      </div>

      {/* Current plan */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-4">Current plan</h2>
        <div className="max-w-[280px]">
          <PlanCard plan={currentPlan} isCurrent currentPlan={currentPlan} index={0} />
        </div>
      </section>

      {/* Available plans */}
      {currentPlan !== 'enterprise' && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-4">Available plans</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {allPlans.map((plan, i) => (
              <PlanCard
                key={plan}
                plan={plan}
                isCurrent={plan === currentPlan}
                currentPlan={currentPlan}
                index={i}
              />
            ))}
          </div>
        </section>
      )}

      {/* Usage */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-4">Usage this billing period</h2>
        <div className="rounded-xl border border-border bg-card">
          <UsageMetricRow
            label="API calls"
            used={usage.apiCalls}
            limit={limits.apiCalls}
          />
          <UsageMetricRow
            label="Storage"
            used={storageMbUsed}
            limit={limits.storageMb}
            unit="MB"
          />
          <UsageMetricRow
            label="Active agents"
            used={usage.agents}
            limit={limits.agents}
          />
        </div>
      </section>

      {/* Portal */}
      <section>
        <h2 className="text-sm font-semibold mb-2">Manage subscription</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Update payment method, download invoices, or cancel.
        </p>
        <BillingPortalButton />
      </section>
    </div>
  )
}
