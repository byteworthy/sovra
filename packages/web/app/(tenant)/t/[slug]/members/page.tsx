'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InviteForm } from '@/components/tenant/invite-form'
import { MemberList } from '@/components/tenant/member-list'

export default function MembersPage() {
  const [inviteExpanded, setInviteExpanded] = useState(false)

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Team members</h1>
          <Badge variant="secondary">Members</Badge>
        </div>
        <Button onClick={() => setInviteExpanded(!inviteExpanded)}>
          Invite member
        </Button>
      </div>

      {/* Invite form */}
      <InviteForm expanded={inviteExpanded} onToggle={() => setInviteExpanded(false)} />

      {/* Member list */}
      <MemberList />
    </div>
  )
}
