import { createHmac, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!signature) return false

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  const signatureBuffer = Buffer.from(signature, 'utf8')

  // timingSafeEqual requires same length buffers
  if (expectedBuffer.length !== signatureBuffer.length) return false

  return timingSafeEqual(expectedBuffer, signatureBuffer)
}

export async function handleWebhookEvent(
  eventName: string,
  data: Record<string, unknown>,
  supabase: SupabaseClient
): Promise<void> {
  const attrs = (data.attributes ?? {}) as Record<string, unknown>
  const meta = (data.meta ?? {}) as Record<string, unknown>
  const custom = (meta.custom ?? {}) as Record<string, unknown>
  const lsId = data.id as string | undefined
  const tenantId = custom.tenant_id as string | undefined

  switch (eventName) {
    case 'subscription_created':
      await supabase.from('subscriptions').upsert({
        lemon_squeezy_id: lsId,
        tenant_id: tenantId,
        plan: attrs.product_name ?? 'free',
        status: attrs.status ?? 'active',
        current_period_end: attrs.renews_at ?? null,
      })
      break

    case 'subscription_updated':
      await supabase
        .from('subscriptions')
        .update({
          plan: attrs.product_name ?? 'free',
          status: attrs.status,
          current_period_end: attrs.renews_at ?? null,
        })
        .eq('lemon_squeezy_id', lsId)
      break

    case 'subscription_cancelled':
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled' })
        .eq('lemon_squeezy_id', lsId)
      break

    case 'subscription_expired':
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('lemon_squeezy_id', lsId)
      break

    case 'subscription_paused':
      await supabase
        .from('subscriptions')
        .update({ status: 'paused' })
        .eq('lemon_squeezy_id', lsId)
      break

    case 'subscription_resumed':
      await supabase
        .from('subscriptions')
        .update({ status: 'active' })
        .eq('lemon_squeezy_id', lsId)
      break

    default:
      console.log(`[billing] unhandled webhook event: ${eventName}`)
      break
  }
}
