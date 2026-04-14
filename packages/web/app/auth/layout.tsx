import type { ReactNode } from 'react'
import { AuthLayout } from '@/components/auth/auth-layout'

export const metadata = {
  title: 'Auth | Sovra',
}

export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>
}
