'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Bot } from 'lucide-react'
import { BrandPanel } from './brand-panel'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      <div className="flex-1 flex flex-col items-center justify-center auth-bg-gradient p-4 md:p-8">
        {/* Mobile logo - hidden on desktop where BrandPanel shows */}
        <div className="flex items-center gap-2 mb-8 md:hidden">
          <Bot className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold text-white">Sovra</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1], delay: 0.1 }}
          className="w-full max-w-[420px]"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
