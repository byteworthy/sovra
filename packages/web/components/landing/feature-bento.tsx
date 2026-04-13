'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Bot, Database, Lock, Users, Cloud, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Bot, Database, Lock, Users, Cloud, Zap,
}

interface Feature {
  icon: string
  title: string
  description: string
}

interface FeatureBentoProps {
  features: Feature[]
}

export function FeatureBento({ features }: FeatureBentoProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08 } },
      }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {features.map((feature, i) => {
        const isLarge = i < 2
        return (
          <motion.div
            key={feature.title}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            className={isLarge ? 'lg:col-span-1 md:col-span-1' : ''}
          >
            <Card
              variant="glass"
              className="h-full hover:shadow-glow-sm transition-all duration-200 cursor-default group"
            >
              <CardHeader className={isLarge ? 'p-8' : 'p-6'}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4 group-hover:bg-primary/15 group-hover:shadow-glow-sm transition-all duration-200">
                  {(() => {
                    const Icon = ICON_MAP[feature.icon] ?? Bot
                    return <Icon className="h-6 w-6 text-primary" />
                  })()}
                </div>
                <CardTitle className={isLarge ? 'text-xl' : 'text-base'}>{feature.title}</CardTitle>
                <CardDescription className={isLarge ? 'text-sm leading-relaxed' : 'text-sm'}>
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
