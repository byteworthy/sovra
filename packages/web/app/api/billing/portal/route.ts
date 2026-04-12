import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSubscriptionForTenant, getCustomerPortalUrl } from '@/lib/billing/actions'

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
            // Read-only context (e.g. Server Component) - ignore
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

  const lsId = subscription.lemon_squeezy_id as string
  const portalUrl = await getCustomerPortalUrl(lsId)
  if (!portalUrl) {
    return Response.json({ error: 'Customer portal URL not available' }, { status: 404 })
  }

  return Response.json({ url: portalUrl })
}
