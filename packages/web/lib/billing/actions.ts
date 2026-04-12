import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from './client'

export async function getSubscriptionForTenant(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) return null
  return data as Record<string, unknown>
}

export async function getUsageForTenant(
  supabase: SupabaseClient,
  tenantId: string
): Promise<{ apiCalls: number; agents: number }> {
  const periodStart = new Date()
  periodStart.setDate(1)
  periodStart.setHours(0, 0, 0, 0)

  const [execResult, agentResult] = await Promise.all([
    supabase
      .from('tool_executions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', periodStart.toISOString()),
    supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
  ])

  return {
    apiCalls: execResult.count ?? 0,
    agents: agentResult.count ?? 0,
  }
}

export async function createCheckoutSession(
  tenantId: string,
  priceId: string,
  planName: string,
  returnUrl: string
): Promise<string | null> {
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: returnUrl,
    metadata: { tenant_id: tenantId, plan: planName },
  })

  return session.url
}

export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string | null> {
  const stripe = getStripe()

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  })

  return session.url
}
