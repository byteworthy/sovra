import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature, handleWebhookEvent } from '@/lib/billing/webhook'

export async function POST(req: NextRequest): Promise<Response> {
  const rawBody = await req.text()
  const signature = req.headers.get('X-Signature') ?? ''

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? ''
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return new Response('Forbidden', { status: 403 })
  }

  let payload: { meta?: { event_name?: string }; data?: unknown }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const eventName = payload.meta?.event_name
  if (!eventName) {
    return new Response('Bad Request: missing event_name', { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await handleWebhookEvent(eventName, payload.data as Record<string, unknown> ?? {}, supabase)

  return new Response('OK', { status: 200 })
}
