'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/lib/tenant/context'
import { createSupabaseBrowserClient } from '@/lib/auth/client'

export function usePermission(action: string): { allowed: boolean; loading: boolean } {
  const { tenantId } = useTenant()
  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setLoading(false)
        return
      }
      supabase
        .from('tenant_users')
        .select('role_id, roles!inner(role_permissions!inner(permissions!inner(action)))')
        .eq('user_id', data.user.id)
        .eq('tenant_id', tenantId)
        .eq('roles.role_permissions.permissions.action', action)
        .maybeSingle()
        .then(({ data: permData }) => {
          setAllowed(!!permData)
          setLoading(false)
        })
    })
  }, [tenantId, action])

  return { allowed, loading }
}

export function useRole(): { role: string | null; loading: boolean } {
  const { tenantId } = useTenant()
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        setLoading(false)
        return
      }
      supabase
        .from('tenant_users')
        .select('roles(name)')
        .eq('user_id', data.user.id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
        .then(({ data: tuData }) => {
          const rolesData = (tuData as { roles?: { name?: string } | null } | null)?.roles
          setRole(rolesData?.name ?? null)
          setLoading(false)
        })
    })
  }, [tenantId])

  return { role, loading }
}
