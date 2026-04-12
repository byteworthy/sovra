import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature, handleWebhookEvent } from '@/lib/billing/webhook'

export async function POST(req: NextRequest): Promise<Response> {
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? ''
  if (!secret) {
    return new Response('Webhook secret not configured', { status: 500 })
  }

  let event
  try {
    event = verifyWebhookSignature(rawBody, signature, secret)
  } catch {
    return new Response('Forbidden', { status: 403 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await handleWebhookEvent(event, supabase)

  return new Response('OK', { status: 200 })
}
