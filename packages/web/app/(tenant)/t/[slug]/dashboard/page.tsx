'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useTenant } from '@/lib/tenant/context'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const { tenant, tenantSlug } = useTenant()

  return (
    <div>
      {/* Welcome card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
        className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-surface-2 to-violet-500/8 border border-border/50 rounded-2xl p-8"
      >
        {/* Decorative top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <h1 className="text-2xl font-semibold tracking-tight relative z-10">
          Welcome to {tenant.name}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 relative z-10">
          Get started by creating your first agent or inviting your team.
        </p>
        <div className="flex gap-3 mt-6 relative z-10">
          <Button
            variant="ghost-premium"
            disabled
            className="opacity-50 cursor-not-allowed"
            title="Coming in next release"
          >
            Create an agent
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
          <Link href={`/t/${tenantSlug}/members`}>
            <Button variant="ghost-premium">
              Invite team members
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {[
          { title: 'Agents', value: '0' },
          { title: 'Workspaces', value: '0' },
          { title: 'Conversations', value: '0' },
        ].map(({ title, value }) => (
          <div
            key={title}
            className="bg-surface-2 rounded-xl border border-border/60 p-6 relative overflow-hidden hover:border-primary/20 hover:shadow-glow-sm transition-all duration-200 group"
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">No data yet</p>
          </div>
        ))}
      </div>
    </div>
  )
}
