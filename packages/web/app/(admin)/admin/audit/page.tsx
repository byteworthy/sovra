import { getAuditLogs } from '@/lib/admin/queries'
import { AuditLogTableWrapper } from './AuditLogTableWrapper'

interface AuditPageProps {
  searchParams: Promise<{ page?: string; severity?: string }>
}

export default async function AuditLogsPage({ searchParams }: AuditPageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const severity = params.severity ?? ''
  const pageSize = 50

  let data: Awaited<ReturnType<typeof getAuditLogs>> = { data: [], total: 0 }

  try {
    data = await getAuditLogs(page, pageSize, severity || undefined)
  } catch {
    // Renders empty state on DB error
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Audit logs</h1>
      <AuditLogTableWrapper
        logs={data.data}
        total={data.total}
        initialPage={page}
        initialSeverity={severity}
        pageSize={pageSize}
      />
    </div>
  )
}
