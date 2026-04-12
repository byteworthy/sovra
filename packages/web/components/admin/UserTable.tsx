'use client'

import { motion } from 'framer-motion'
import { VARIANTS } from '@/lib/motion'
import type { AdminUser } from '@/lib/admin/queries'

interface UserTableProps {
  users: AdminUser[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function UserTable({ users, total, page, pageSize, onPageChange }: UserTableProps) {
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <>
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_2fr_2fr_1fr_1.5fr_1fr] gap-4 px-4 py-3 border-b border-border bg-card">
          {['Name', 'Email', 'Tenants', 'Role', 'Created', 'Status'].map((col) => (
            <span key={col} className="text-xs text-muted-foreground font-medium">
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        {users.map((user, i) => (
          <motion.div
            key={user.id}
            {...VARIANTS.listItem}
            transition={{ ...VARIANTS.listItem.transition, delay: i * 0.03 }}
            className="grid grid-cols-[2fr_2fr_2fr_1fr_1.5fr_1fr] gap-4 px-4 items-center h-[56px] border-b border-border last:border-b-0 hover:bg-zinc-900/40 transition-colors duration-100"
          >
            <span className="text-sm font-semibold truncate">{user.full_name ?? 'No name'}</span>
            <span className="text-sm text-muted-foreground truncate">{user.email}</span>
            <span className="text-sm text-muted-foreground truncate">
              {user.tenant_associations?.map((a) => a.tenant_name).join(', ') ?? '-'}
            </span>
            <span className="text-sm text-muted-foreground">
              {user.tenant_associations?.[0]?.role ?? 'member'}
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(user.created_at)}</span>
            <span className="text-xs font-semibold text-green-400">Active</span>
          </motion.div>
        ))}

        {users.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No users found.</div>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>
            {start}-{end} of {total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="h-8 px-3 rounded-md border border-border hover:bg-zinc-800/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="h-8 px-3 rounded-md border border-border hover:bg-zinc-800/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  )
}
