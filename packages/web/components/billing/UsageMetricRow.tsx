'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface UsageMetricRowProps {
  label: string
  used: number
  limit: number
  unit?: string
}

function getBarColor(pct: number): string {
  if (pct > 90) return 'bg-status-error'
  if (pct > 70) return 'bg-status-warning'
  return 'bg-primary'
}

function formatValue(n: number, unit?: string): string {
  if (unit) return `${n.toLocaleString()} ${unit}`
  return n.toLocaleString()
}

export function UsageMetricRow({ label, used, limit, unit }: UsageMetricRowProps) {
  const isUnlimited = limit === -1
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const isNearLimit = !isUnlimited && pct > 90

  const [barWidth, setBarWidth] = useState(0)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      // Trigger CSS transition on mount
      requestAnimationFrame(() => {
        setBarWidth(pct)
      })
    }
  }, [pct])

  const tooltipText = isUnlimited
    ? 'Unlimited'
    : `${formatValue(used, unit)} of ${formatValue(limit, unit)} used this period`

  return (
    <div className="py-4 border-b border-border last:border-b-0 flex items-center justify-between">
      {/* Left: label */}
      <div className="flex flex-col gap-0.5">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-muted-foreground">This billing period</span>
      </div>

      {/* Right: value + bar */}
      <div className="flex flex-col items-end gap-1.5">
        {isUnlimited ? (
          <span className="text-sm font-semibold text-muted-foreground">Unlimited</span>
        ) : (
          <span className="text-sm font-semibold">
            {formatValue(used, unit)} / {formatValue(limit, unit)}
          </span>
        )}

        {!isUnlimited && (
          <div className="relative group">
            <div className="w-[160px] h-2 rounded-full bg-surface-3 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all ease-out', getBarColor(pct))}
                style={{ width: `${barWidth}%`, transitionDuration: '600ms' }}
              />
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 rounded bg-surface-3 border border-border text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {tooltipText}
            </div>
          </div>
        )}

        {isNearLimit && (
          <span className="text-xs text-status-error max-w-[200px] text-right">
            Approaching limit. Upgrade your plan to increase your quota.
          </span>
        )}
      </div>
    </div>
  )
}
