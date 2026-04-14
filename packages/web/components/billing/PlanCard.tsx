'use client'

import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { VARIANTS } from '@/lib/motion'
import type { PlanId } from '@/lib/billing/plans'
import { PLAN_DISPLAY, PLANS } from '@/lib/billing/plans'
import { cn } from '@/lib/utils'

const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: [
    `${PLANS.free.agents} agents`,
    `${PLANS.free.apiCalls.toLocaleString()} API calls/month`,
    `${PLANS.free.storageMb} MB storage`,
    `${PLANS.free.workspaces} workspace`,
  ],
  pro: [
    `${PLANS.pro.agents} agents`,
    `${PLANS.pro.apiCalls.toLocaleString()} API calls/month`,
    `${PLANS.pro.storageMb / 1000} GB storage`,
    `${PLANS.pro.workspaces} workspaces`,
    'Priority support',
  ],
  enterprise: [
    'Unlimited agents',
    'Unlimited API calls',
    'Unlimited storage',
    'Unlimited workspaces',
    'SLA + dedicated support',
    'Custom integrations',
  ],
}

const BADGE_CLASSES: Record<PlanId, string> = {
  free: 'plan-free',
  pro: 'bg-blue-500/15 text-blue-400',
  enterprise: 'bg-violet-500/15 text-violet-400',
}

interface PlanCardProps {
  plan: PlanId
  isCurrent: boolean
  currentPlan: PlanId
  onSelect?: (plan: PlanId) => void
  index?: number
}

export function PlanCard({ plan, isCurrent, currentPlan, onSelect, index = 0 }: PlanCardProps) {
  const display = PLAN_DISPLAY[plan]
  const features = PLAN_FEATURES[plan]
  const isEnterprise = plan === 'enterprise'

  const planOrder: Record<PlanId, number> = { free: 0, pro: 1, enterprise: 2 }
  const isUpgrade = planOrder[plan] > planOrder[currentPlan]

  function renderCta() {
    if (isCurrent) {
      return (
        <button
          disabled
          className="mt-auto w-full rounded-md border border-border px-3 py-2 text-sm font-semibold text-muted-foreground cursor-not-allowed"
        >
          Current plan
        </button>
      )
    }
    if (isEnterprise) {
      return (
        <a
          href="mailto:scale@getbyteworthy.com"
          className="mt-auto w-full rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground hover:border-primary/20 transition-colors text-center block"
        >
          Contact sales
        </a>
      )
    }
    if (isUpgrade) {
      return (
        <button
          onClick={() => onSelect?.(plan)}
          className="mt-auto w-full rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Upgrade to {display.name}
        </button>
      )
    }
    return (
      <button
        onClick={() => onSelect?.(plan)}
        className="mt-auto w-full rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground hover:border-primary/20 transition-colors"
      >
        Downgrade to {display.name}
      </button>
    )
  }

  return (
    <motion.div
      initial={VARIANTS.listItem.initial}
      animate={VARIANTS.listItem.animate}
      transition={{ ...VARIANTS.listItem.transition, delay: index * 0.04 }}
      className={cn(
        'flex flex-col rounded-xl border p-6 min-h-[240px] transition-colors duration-150',
        isCurrent
          ? 'bg-blue-500/[0.06] border-blue-500/30'
          : 'bg-card border-border hover:border-primary/20',
        isEnterprise && 'plan-enterprise-glow'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold">{display.name}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', BADGE_CLASSES[plan])}>
          {display.name}
        </span>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-4">
        {display.price === 'custom' ? (
          <span className="text-3xl font-bold tracking-tight">Custom</span>
        ) : (
          <>
            <span className="text-3xl font-bold tracking-tight">${display.price}</span>
            <span className="text-xs text-muted-foreground">/month</span>
          </>
        )}
      </div>

      {/* Features */}
      <ul className="flex flex-col gap-2 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-status-online shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-4">{renderCta()}</div>
    </motion.div>
  )
}
