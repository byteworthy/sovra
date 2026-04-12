'use client'

import { AuthLayout } from '@/components/auth/auth-layout'
import { OnboardingWizard } from '@/components/onboarding/wizard'

export default function OnboardingPage() {
  return (
    <AuthLayout>
      <OnboardingWizard />
    </AuthLayout>
  )
}
