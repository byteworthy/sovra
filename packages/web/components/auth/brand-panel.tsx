'use client'

import { motion } from 'framer-motion'
import { Bot, CheckCircle2 } from 'lucide-react'

const features = [
  'Multi-tenant authentication out of the box',
  'MCP-native agent orchestration',
  'Production-ready from day one',
]

export function BrandPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, x: '-100%' }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="hidden md:flex w-[45%] flex-col justify-between bg-surface-2 p-8 lg:p-12 relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle, hsl(var(--surface-3)) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Animated gradient mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute -bottom-1/4 -right-1/4 w-3/4 h-3/4 rounded-full bg-violet-500/5 blur-3xl animate-float [animation-delay:2s]" />
      </div>

      <div className="flex items-center gap-2 relative z-10">
        <Bot className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold text-foreground">Sovra</span>
      </div>

      <div className="space-y-6 relative z-10">
        <h1 className="text-3xl font-semibold tracking-tighter text-foreground">
          Build AI Apps in Hours, Not Weeks
        </h1>
        <ul className="space-y-3">
          {features.map((text) => (
            <li key={text} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm text-muted-foreground">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground relative z-10">
        Open Source &middot; MIT License
      </p>
    </motion.div>
  )
}
