'use client'

import { useState } from 'react'
import { AuditLogTable } from '@/components/admin/AuditLogTable'
import type { AuditLog } from '@/lib/admin/queries'

interface AuditLogTableWrapperProps {
  logs: AuditLog[]
  total: number
  initialPage: number
  initialSeverity: string
  pageSize: number
}

export function AuditLogTableWrapper({
  logs,
  total,
  initialPage,
  initialSeverity,
  pageSize,
}: AuditLogTableWrapperProps) {
  const [page, setPage] = useState(initialPage)
  const [severity, setSeverity] = useState(initialSeverity)

  return (
    <AuditLogTable
      logs={logs}
      total={total}
      page={page}
      pageSize={pageSize}
      severity={severity}
      onPageChange={setPage}
      onSeverityChange={setSeverity}
    />
  )
}
