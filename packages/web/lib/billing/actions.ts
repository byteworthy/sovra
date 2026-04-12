import type { SupabaseClient } from '@supabase/supabase-js'
import { getSubscription } from '@lemonsqueezy/lemonsqueezy.js'
import { configureLemonSqueezy } from './client'

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

export async function getCustomerPortalUrl(
  lsSubscriptionId: string
): Promise<string | null> {
  configureLemonSqueezy()
  const { data, error } = await getSubscription(lsSubscriptionId)
  if (error || !data) return null
  const urls = data.data?.attributes?.urls as Record<string, string> | undefined
  return urls?.customer_portal ?? null
}
