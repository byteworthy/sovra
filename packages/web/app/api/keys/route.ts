import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { generateApiKey } from '@/lib/api-keys/generator'

const createKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  permissions: z.array(z.string()).optional().default([]),
  expires_at: z.string().datetime().optional(),
})

export async function GET(_req: Request) {
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

  const { data: keys, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, permissions, expires_at, revoked_at, last_used_at, created_at')
    .eq('tenant_id', tenantUser.tenant_id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })
  }

  return NextResponse.json({ keys: keys ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, permissions, expires_at } = parsed.data

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!tenantUser) {
    return NextResponse.json({ error: 'No tenant found for user' }, { status: 403 })
  }

  const { raw, hash, prefix } = generateApiKey()

  const { data: newKey, error } = await supabase
    .from('api_keys')
    .insert({
      tenant_id: tenantUser.tenant_id,
      name,
      key_hash: hash,
      key_prefix: prefix,
      permissions,
      expires_at: expires_at ?? null,
      created_by: user.id,
    })
    .select('id, name, key_prefix, permissions, expires_at')
    .single()

  if (error || !newKey) {
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 })
  }

  // Audit log — fire-and-forget
  void supabase.from('audit_logs').insert({
    tenant_id: tenantUser.tenant_id,
    user_id: user.id,
    action: 'api_key.created',
    resource: 'api_key',
    resource_id: newKey.id,
  })

  return NextResponse.json(
    {
      id: newKey.id,
      name: newKey.name,
      key_prefix: newKey.key_prefix,
      permissions: newKey.permissions,
      expires_at: newKey.expires_at,
      raw_key: raw,
    },
    { status: 201 }
  )
}
