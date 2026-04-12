'use client'

import { useState } from 'react'
import { AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { VARIANTS } from '@/lib/motion'
import type { AuditLog } from '@/lib/admin/queries'

interface AuditLogTableProps {
  logs: AuditLog[]
  total: number
  page: number
  pageSize: number
  severity: string
  onPageChange: (page: number) => void
  onSeverityChange: (severity: string) => void
}

const SEVERITY_FILTERS = ['All', 'Info', 'Warning', 'Critical'] as const

const SEVERITY_ICON: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
}

const SEVERITY_COLOR: Record<string, string> = {
  info: 'text-zinc-400',
  warning: 'text-amber-400',
  critical: 'text-red-500',
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AuditLogTable({
  logs,
  total,
  page,
  pageSize,
  severity,
  onPageChange,
  onSeverityChange,
}: AuditLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const activeSeverityLabel = severity
    ? severity.charAt(0).toUpperCase() + severity.slice(1)
    : 'All'

  return (
    <div className="space-y-4">
      {/* Severity filter pills */}
      <div className="flex gap-2">
        {SEVERITY_FILTERS.map((filter) => {
          const isActive = activeSeverityLabel === filter
          return (
            <button
              key={filter}
              onClick={() => onSeverityChange(filter === 'All' ? '' : filter.toLowerCase())}
              className={[
                'h-7 px-3 rounded-full text-xs font-medium transition-colors',
                isActive
                  ? 'bg-zinc-700 text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {filter}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden">
        {logs.map((log, i) => {
          const SeverityIcon = SEVERITY_ICON[log.severity] ?? Info
          const severityColor = SEVERITY_COLOR[log.severity] ?? 'text-zinc-400'
          const isExpanded = expandedId === log.id

          return (
            <div key={log.id}>
              <motion.div
                {...VARIANTS.messageEnter}
                transition={{ ...VARIANTS.messageEnter.transition, delay: i * 0.02 }}
                className="py-3 px-4 flex items-center gap-3 border-b border-border/50 last:border-b-0 hover:bg-zinc-900/30 cursor-pointer transition-colors duration-100"
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
              >
                <SeverityIcon className={['h-3.5 w-3.5 shrink-0', severityColor].join(' ')} />
                <div className="flex-1 min-w-0">
                  <span className={['text-xs font-semibold uppercase mr-1.5', severityColor].join(' ')}>
                    {log.severity}
                  </span>
                  <span className="text-sm">{log.action}</span>
                  {log.actor_id && (
                    <span className="text-xs text-muted-foreground ml-2">by {log.actor_id}</span>
                  )}
                  {log.tenant_id && (
                    <span className="text-xs text-muted-foreground/60 ml-1">{log.tenant_id}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatTimestamp(log.created_at)}
                </span>
              </motion.div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden border-b border-border/50"
                  >
                    <pre className="bg-zinc-900/60 p-3 text-xs font-mono text-foreground overflow-x-auto">
                      {JSON.stringify(log.metadata ?? {}, null, 2)}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        {logs.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No audit logs found.</div>
        )}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
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
    </div>
  )
}
