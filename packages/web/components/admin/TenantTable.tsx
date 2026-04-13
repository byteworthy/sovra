'use client'

import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { motion } from 'framer-motion'
import { VARIANTS } from '@/lib/motion'
import type { AdminTenant } from '@/lib/admin/queries'

interface TenantTableProps {
  tenants: AdminTenant[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-surface-3/60 text-muted-foreground',
  pro: 'bg-blue-500/15 text-blue-400',
  enterprise: 'bg-purple-500/15 text-purple-400',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface ConfirmDialogProps {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}

function ConfirmDialog({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel, destructive }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{body}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-8 px-3 text-sm rounded-md border border-border hover:bg-surface-3/60 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={[
              'h-8 px-3 text-sm rounded-md transition-colors',
              destructive
                ? 'bg-destructive/10 text-red-400 hover:bg-destructive/20 border border-destructive/30'
                : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function TenantTable({ tenants, total, page, pageSize, onPageChange }: TenantTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'suspend' | 'delete'
    tenantId: string
    tenantName: string
  } | null>(null)

  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  function handleSuspend(tenantId: string, tenantName: string) {
    setOpenMenu(null)
    setConfirmAction({ type: 'suspend', tenantId, tenantName })
  }

  function handleDelete(tenantId: string, tenantName: string) {
    setOpenMenu(null)
    setConfirmAction({ type: 'delete', tenantId, tenantName })
  }

  async function handleConfirm() {
    if (!confirmAction) return
    // TODO: Wire to server actions for suspend/delete tenant operations
    setConfirmAction(null)
  }

  return (
    <>
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.type === 'suspend' ? 'Suspend tenant?' : 'Delete tenant?'}
          body={
            confirmAction.type === 'suspend'
              ? 'Suspend this tenant? Their users will lose access immediately.'
              : 'Delete this tenant? All their data will be permanently removed. This cannot be undone.'
          }
          confirmLabel={confirmAction.type === 'suspend' ? 'Suspend tenant' : 'Delete tenant'}
          cancelLabel={confirmAction.type === 'suspend' ? 'Cancel' : 'Keep tenant'}
          destructive={confirmAction.type === 'delete'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <div className="border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1fr_40px] gap-4 px-4 py-3 border-b border-border bg-card">
          {['Name', 'Plan', 'Users', 'Agents', 'Created', 'Status', ''].map((col) => (
            <span key={col} className="text-xs text-muted-foreground font-medium">
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        {tenants.map((tenant, i) => (
          <motion.div
            key={tenant.id}
            {...VARIANTS.listItem}
            transition={{ ...VARIANTS.listItem.transition, delay: i * 0.03 }}
            className="grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1fr_40px] gap-4 px-4 items-center h-[56px] border-b border-border last:border-b-0 hover:bg-surface-2/60 transition-colors duration-100 relative"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{tenant.name}</p>
              <p className="text-xs text-muted-foreground truncate">{tenant.slug}</p>
            </div>
            <div>
              <span
                className={[
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  PLAN_BADGE[tenant.plan] ?? PLAN_BADGE.free,
                ].join(' ')}
              >
                {tenant.plan}
              </span>
            </div>
            <span className="text-sm">{tenant.user_count ?? 0}</span>
            <span className="text-sm">{tenant.agent_count ?? 0}</span>
            <span className="text-xs text-muted-foreground">{formatDate(tenant.created_at)}</span>
            <div>
              <span
                className={[
                  'text-xs font-semibold',
                  tenant.status === 'suspended' ? 'text-status-warning' : 'text-status-online',
                ].join(' ')}
              >
                {tenant.status === 'suspended' ? 'Suspended' : 'Active'}
              </span>
            </div>
            <div className="relative">
              <button
                onClick={() => setOpenMenu(openMenu === tenant.id ? null : tenant.id)}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-3/70 transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {openMenu === tenant.id && (
                <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[140px]">
                  <button
                    className="w-full text-left text-sm px-3 py-2 hover:bg-surface-3/60 transition-colors"
                    onClick={() => setOpenMenu(null)}
                  >
                    View
                  </button>
                  <button
                    className="w-full text-left text-sm px-3 py-2 hover:bg-surface-3/60 transition-colors text-status-warning"
                    onClick={() => handleSuspend(tenant.id, tenant.name)}
                  >
                    Suspend
                  </button>
                  <div className="h-px bg-border mx-2 my-1" />
                  <button
                    className="w-full text-left text-sm px-3 py-2 hover:bg-surface-3/60 transition-colors text-status-error"
                    onClick={() => handleDelete(tenant.id, tenant.name)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {tenants.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No tenants found.</div>
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
              className="h-8 px-3 rounded-md border border-border hover:bg-surface-3/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="h-8 px-3 rounded-md border border-border hover:bg-surface-3/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  )
}
