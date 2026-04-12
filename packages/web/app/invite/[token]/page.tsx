'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { acceptInvitation } from '@/lib/rbac/invitation'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthCard } from '@/components/auth/auth-card'
import { Button } from '@/components/ui/button'

type InviteState =
  | { status: 'loading' }
  | { status: 'success'; tenantId: string }
  | { status: 'expired' }
  | { status: 'invalid' }
  | { status: 'unauthenticated' }

export default function InviteAcceptPage() {
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const [state, setState] = useState<InviteState>({ status: 'loading' })

  useEffect(() => {
    acceptInvitation(params.token).then((result) => {
      if (result.error === 'Not authenticated') {
        router.push(`/auth/login?next=/invite/${params.token}`)
        return
      }
      if (result.error?.includes('expired')) {
        setState({ status: 'expired' })
        return
      }
      if (result.error) {
        setState({ status: 'invalid' })
        return
      }
      if (result.tenantId) {
        setState({ status: 'success', tenantId: result.tenantId })
      }
    })
  }, [params.token, router])

  return (
    <AuthLayout>
      <AuthCard>
        {state.status === 'loading' && (
          <div className="flex items-center justify-center py-8" aria-busy="true">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          </div>
        )}

        {state.status === 'success' && (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex justify-center mb-4"
            >
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome to the team</h1>
            <p className="text-sm text-muted-foreground mt-2">
              You now have access to this workspace.
            </p>
            <Button
              onClick={() => router.push(`/t/${state.tenantId}/dashboard`)}
              className="w-full h-11 mt-6"
            >
              Open your dashboard
            </Button>
          </div>
        )}

        {state.status === 'expired' && (
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-semibold tracking-tight">This invitation has expired</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Ask the workspace owner to send you a new invitation.
            </p>
          </div>
        )}

        {state.status === 'invalid' && (
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-semibold tracking-tight">Invitation not found</h1>
            <p className="text-sm text-muted-foreground mt-2">
              This link may have already been used or is no longer valid.
            </p>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  )
}
