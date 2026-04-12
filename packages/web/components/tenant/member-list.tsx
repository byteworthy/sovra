'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { usePermission } from '@/lib/rbac/hooks'
import { useTenant } from '@/lib/tenant/context'
import { createSupabaseBrowserClient } from '@/lib/auth/client'
import { useToast } from '@/lib/toast'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { MemberRow } from './member-row'

interface Member {
  userId: string
  name: string
  email: string
  avatarUrl?: string
  role: string
  joinedAt: string
}

export function MemberList() {
  const { allowed: canRead, loading: permLoading } = usePermission('member:read')
  const { allowed: canManage } = usePermission('member:manage')
  const { tenantId } = useTenant()
  const { toast } = useToast()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (permLoading || !canRead) return

    const supabase = createSupabaseBrowserClient()
    supabase
      .from('tenant_users')
      .select('user_id, created_at, users(email, full_name, avatar_url), roles(name)')
      .eq('tenant_id', tenantId)
      .then(({ data: rows }) => {
        if (!rows) {
          setLoading(false)
          return
        }
        const mapped: Member[] = rows.map((r: Record<string, unknown>) => {
          const user = r.users as { email?: string; full_name?: string; avatar_url?: string } | null
          const role = r.roles as { name?: string } | null
          return {
            userId: r.user_id as string,
            name: user?.full_name ?? user?.email ?? 'Unknown',
            email: user?.email ?? '',
            avatarUrl: user?.avatar_url ?? undefined,
            role: role?.name ?? 'member',
            joinedAt: r.created_at as string,
          }
        })
        setMembers(mapped)
        setLoading(false)
      })
  }, [tenantId, canRead, permLoading])

  if (permLoading || loading) {
    return (
      <div className="space-y-2 mt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 flex gap-3 items-center px-4">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="w-32 h-3" />
              <Skeleton className="w-24 h-2.5" />
            </div>
            <Skeleton className="w-16 h-5 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    )
  }

  if (!canRead) return null

  if (members.length <= 1) {
    return (
      <EmptyState
        icon={<Users className="h-6 w-6" />}
        heading="Just you here"
        body="Invite teammates to collaborate on AI agents."
        action={<Button>Invite your first member</Button>}
      />
    )
  }

  function handleRemove(userId: string) {
    const supabase = createSupabaseBrowserClient()
    supabase
      .from('tenant_users')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) {
          toast('error', 'Failed to remove member')
          return
        }
        const removed = members.find((m) => m.userId === userId)
        setMembers((prev) => prev.filter((m) => m.userId !== userId))
        toast('success', `Removed ${removed?.name ?? 'member'}`)
      })
  }

  function handleRoleChange(userId: string, roleName: string) {
    const supabase = createSupabaseBrowserClient()
    supabase
      .from('tenant_users')
      .update({ role: roleName })
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .then(({ error }) => {
        if (error) {
          toast('error', 'Failed to change role')
          return
        }
        setMembers((prev) =>
          prev.map((m) => (m.userId === userId ? { ...m, role: roleName } : m))
        )
        toast('success', `Role updated to ${roleName}`)
      })
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      transition={{ staggerChildren: 0.05 }}
      className="mt-4 space-y-1"
    >
      {members.map((member) => (
        <MemberRow
          key={member.userId}
          member={member}
          canManage={canManage}
          onRemove={handleRemove}
          onRoleChange={handleRoleChange}
        />
      ))}
    </motion.div>
  )
}
