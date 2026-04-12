import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSubscriptionForTenant, createPortalSession } from '@/lib/billing/actions'

export async function POST(req: NextRequest): Promise<Response> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Read-only context -- ignore
          }
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tenantId } = await req.json()
  if (!tenantId) {
    return Response.json({ error: 'tenantId required' }, { status: 400 })
  }

  const subscription = await getSubscriptionForTenant(supabase, tenantId)
  if (!subscription) {
    return Response.json({ error: 'No active subscription found' }, { status: 404 })
  }

  const customerId = subscription.stripe_customer_id as string
  if (!customerId) {
    return Response.json({ error: 'No Stripe customer linked' }, { status: 404 })
  }

  const returnUrl = req.headers.get('referer') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const portalUrl = await createPortalSession(customerId, returnUrl)
  if (!portalUrl) {
    return Response.json({ error: 'Could not create portal session' }, { status: 500 })
  }

  return Response.json({ url: portalUrl })
}
