'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Bot, Users, Settings } from 'lucide-react'
import { useTenant } from '@/lib/tenant/context'
import { cn } from '@/lib/utils'

import type { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  icon: LucideIcon
  path: string
  disabled?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: 'dashboard' },
  { label: 'Agents', icon: Bot, path: 'agents', disabled: false },
  { label: 'Members', icon: Users, path: 'members' },
  { label: 'Settings', icon: Settings, path: 'settings', disabled: true },
]

export function SidebarNav() {
  const pathname = usePathname()
  const { tenantSlug } = useTenant()

  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {NAV_ITEMS.map(({ label, icon: Icon, path, disabled }) => {
        const href = `/t/${tenantSlug}/${path}`
        const isActive = pathname === href || pathname.startsWith(`${href}/`)

        if (disabled) {
          return (
            <div
              key={path}
              title="Coming in next release"
              className="relative flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted-foreground/50 cursor-not-allowed"
            >
              <Icon className="h-4 w-4" />
              {label}
            </div>
          )
        }

        return (
          <Link
            key={path}
            href={href}
            className={cn(
              'relative flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors duration-150',
              isActive
                ? "bg-accent/10 text-primary before:content-[''] before:absolute before:left-0 before:h-5 before:w-0.5 before:rounded-full before:bg-primary"
                : 'text-muted-foreground hover:bg-zinc-800/50 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
