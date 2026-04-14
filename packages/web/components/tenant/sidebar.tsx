'use client'

import { useState } from 'react'
import { Bot, LogOut, Menu, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/auth/client'
import { useTenant } from '@/lib/tenant/context'
import { Avatar } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { TenantSwitcher } from './tenant-switcher'
import { SidebarNav } from './sidebar-nav'

export function Sidebar() {
  useTenant()

  return (
    <aside className="hidden md:flex flex-col w-60 bg-surface-2 border-r border-border min-h-screen relative">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-border">
        <Bot className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold text-foreground">Sovra</span>
      </div>

      {/* Tenant switcher */}
      <div className="px-3 py-2">
        <TenantSwitcher />
      </div>

      <div className="h-px bg-border mx-3 my-2" />

      {/* Navigation */}
      <SidebarNav />

      {/* User section */}
      <UserSection />
    </aside>
  )
}

function UserSection() {
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <div className="mt-auto p-3 border-t border-border">
      <div className="flex items-center gap-2">
        <Avatar name="User" size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">Account</p>
        </div>
        <ThemeToggle />
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-3/70 transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden h-9 w-9 flex items-center justify-center rounded-md hover:bg-surface-3/70 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-60 h-full bg-surface-2 border-r border-border flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-4 h-16 border-b border-border">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-foreground">Sovra</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-3 py-2">
              <TenantSwitcher />
            </div>
            <div className="h-px bg-border mx-3 my-2" />
            <SidebarNav />
          </div>
        </div>
      )}
    </>
  )
}
