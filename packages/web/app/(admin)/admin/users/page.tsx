import { getAllUsers } from '@/lib/admin/queries'
import { UserTableWrapper } from './UserTableWrapper'

interface UsersPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const pageSize = 20

  let data: Awaited<ReturnType<typeof getAllUsers>> = { data: [], total: 0 }

  try {
    data = await getAllUsers(page, pageSize)
  } catch {
    // Renders empty state on DB error
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
      <UserTableWrapper
        users={data.data}
        total={data.total}
        initialPage={page}
        pageSize={pageSize}
      />
    </div>
  )
}
