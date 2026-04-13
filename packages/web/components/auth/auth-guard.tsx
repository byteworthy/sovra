'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/auth/client'
import { Skeleton } from '@/components/ui/skeleton'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setState('unauthenticated')
        router.push('/auth/login')
      } else {
        setState('authenticated')
      }
    })
  }, [router])

  if (state === 'loading') {
    return (
      fallback ?? (
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="grid grid-cols-3 gap-4 mt-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      )
    )
  }

  if (state === 'unauthenticated') {
    return null
  }

  return (
    <div className="animate-in fade-in duration-300">
      {children}
    </div>
  )
}
