import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/auth/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!tenantUser) {
    return NextResponse.json({ error: 'No tenant found for user' }, { status: 403 })
  }

  // Verify key exists and belongs to this tenant
  const { data: existingKey, error: fetchError } = await supabase
    .from('api_keys')
    .select('id, tenant_id')
    .eq('id', id)
    .eq('tenant_id', tenantUser.tenant_id)
    .single()

  if (fetchError || !existingKey) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantUser.tenant_id)
    .select('id')
    .single()

  if (updateError) {
    return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
  }

  // Audit log — fire-and-forget
  void supabase.from('audit_logs').insert({
    tenant_id: tenantUser.tenant_id,
    user_id: user.id,
    action: 'api_key.revoked',
    resource: 'api_key',
    resource_id: id,
  })

  return NextResponse.json({ success: true })
}
