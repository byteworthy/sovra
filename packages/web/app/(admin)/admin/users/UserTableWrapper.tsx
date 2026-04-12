'use client'

import { useState } from 'react'
import { UserTable } from '@/components/admin/UserTable'
import type { AdminUser } from '@/lib/admin/queries'

interface UserTableWrapperProps {
  users: AdminUser[]
  total: number
  initialPage: number
  pageSize: number
}

export function UserTableWrapper({ users, total, initialPage, pageSize }: UserTableWrapperProps) {
  const [page, setPage] = useState(initialPage)

  return (
    <UserTable
      users={users}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
    />
  )
}
