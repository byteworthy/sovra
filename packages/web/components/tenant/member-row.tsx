'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { VARIANTS } from '@/lib/motion'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface MemberRowProps {
  member: {
    userId: string
    name: string
    email: string
    avatarUrl?: string
    role: string
    joinedAt: string
  }
  canManage: boolean
  onRemove: (userId: string) => void
  onRoleChange: (userId: string, roleId: string) => void
}

export function MemberRow({ member, canManage, onRemove, onRoleChange }: MemberRowProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [removing, setRemoving] = useState(false)

  function handleRemove() {
    setRemoving(true)
    onRemove(member.userId)
  }

  const formattedDate = new Date(member.joinedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <AnimatePresence>
      {!removing && (
        <motion.div
          layout
          {...VARIANTS.listItem}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-3 px-4 h-14 hover:bg-zinc-800/30 transition-colors duration-100 rounded-md"
        >
          <Avatar name={member.name} src={member.avatarUrl} size="md" />

          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold truncate">{member.name}</span>
            <span className="text-xs text-muted-foreground truncate">{member.email}</span>
          </div>

          <Badge variant="secondary" className="shrink-0">{member.role}</Badge>

          <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
            {formattedDate}
          </span>

          {canManage && !confirmingRemove && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-zinc-800/50 transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  sideOffset={4}
                  align="end"
                  className="z-50 min-w-[160px] rounded-lg border border-border bg-card p-1 shadow-lg"
                >
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger className="flex items-center px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-zinc-800/50 outline-none">
                      Change role
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.SubContent
                        sideOffset={4}
                        className="z-50 min-w-[120px] rounded-lg border border-border bg-card p-1 shadow-lg"
                      >
                        {['admin', 'member', 'viewer'].map((role) => (
                          <DropdownMenu.Item
                            key={role}
                            onSelect={() => onRoleChange(member.userId, role)}
                            className="flex items-center px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-zinc-800/50 outline-none capitalize"
                          >
                            {role}
                          </DropdownMenu.Item>
                        ))}
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Sub>

                  <DropdownMenu.Separator className="h-px bg-border my-1" />

                  <DropdownMenu.Item
                    onSelect={() => setConfirmingRemove(true)}
                    className="flex items-center px-2 py-1.5 rounded-md text-sm cursor-pointer text-destructive hover:bg-destructive/10 outline-none"
                  >
                    Remove member
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}

          {confirmingRemove && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                Remove <strong>{member.name}</strong>?
              </span>
              <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={handleRemove}>
                Remove
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setConfirmingRemove(false)}>
                Cancel
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
