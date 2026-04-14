'use server'

import { randomBytes } from 'crypto'
import { createSupabaseServerClient } from '@/lib/auth/server'
import type { Invitation, InviteType } from '@sovra/shared'

interface CreateInvitationInput {
  tenantId: string
  roleId: string
  email?: string
  inviteType: InviteType
  maxUses?: number
  expiresInDays?: number
}

interface InvitationResult {
  invitation: Invitation | null
  error: string | null
}

export async function createInvitation(input: CreateInvitationInput): Promise<InvitationResult> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { invitation: null, error: 'Not authenticated' }

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays ?? 7))

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      tenant_id: input.tenantId,
      role_id: input.roleId,
      email: input.email ?? null,
      token,
      invite_type: input.inviteType,
      status: 'pending',
      max_uses: input.maxUses ?? (input.inviteType === 'email' ? 1 : null),
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { invitation: null, error: error.message }

  return {
    invitation: {
      id: data.id,
      tenantId: data.tenant_id,
      email: data.email,
      roleId: data.role_id,
      token: data.token,
      inviteType: data.invite_type as InviteType,
      status: data.status as Invitation['status'],
      maxUses: data.max_uses,
      useCount: data.use_count,
      expiresAt: data.expires_at,
      createdBy: data.created_by,
      createdAt: data.created_at,
    },
    error: null,
  }
}

export async function createInviteLink(
  tenantId: string,
  roleId: string,
  maxUses?: number,
  expiresInDays?: number
): Promise<InvitationResult> {
  return createInvitation({
    tenantId,
    roleId,
    inviteType: 'link',
    maxUses,
    expiresInDays,
  })
}

export async function acceptInvitation(
  token: string
): Promise<{ tenantId: string | null; error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { tenantId: null, error: 'Not authenticated' }

  // Fetch invitation by token
  const { data: invite, error: fetchError } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .single()

  if (fetchError || !invite) return { tenantId: null, error: 'Invalid or expired invitation' }

  // Reject expired invitations
  if (new Date(invite.expires_at) < new Date()) {
    await supabase.from('invitations').update({ status: 'expired' }).eq('id', invite.id)
    return { tenantId: null, error: 'Invitation has expired' }
  }

  // Reject invitations that have hit max uses
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return { tenantId: null, error: 'Invitation has reached maximum uses' }
  }

  // Resolve role name for backward-compat tenant_users.role column
  const { data: roleData } = await supabase
    .from('roles')
    .select('name')
    .eq('id', invite.role_id)
    .single()

  // Add user to tenant
  const { error: addError } = await supabase.from('tenant_users').insert({
    tenant_id: invite.tenant_id,
    user_id: user.id,
    role: roleData?.name ?? 'member',
    role_id: invite.role_id,
  })

  if (addError) {
    // Already a member: treat as success
    if (addError.code === '23505') return { tenantId: invite.tenant_id, error: null }
    return { tenantId: null, error: addError.message }
  }

  // Increment use_count; mark email invites as accepted
  const useCount = invite.use_count + 1
  if (invite.invite_type === 'email') {
    await supabase.from('invitations').update({ use_count: useCount, status: 'accepted' }).eq('id', invite.id)
  } else {
    await supabase.from('invitations').update({ use_count: useCount }).eq('id', invite.id)
  }

  return { tenantId: invite.tenant_id, error: null }
}
