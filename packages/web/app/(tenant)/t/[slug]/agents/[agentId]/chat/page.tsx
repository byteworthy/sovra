import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { getAgent } from '@/lib/agent/queries'
import { listConversations, getMessages } from '@/lib/chat/queries'
import { ChatPageClient } from './chat-page-client'
import type { Message } from 'ai'

interface ChatPageProps {
  params: Promise<{ slug: string; agentId: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { slug, agentId } = await params
  const supabase = await createSupabaseServerClient()

  const { data: agent } = await getAgent(supabase, agentId)
  if (!agent) redirect(`/t/${slug}/agents`)

  const tenantId = agent.tenant_id as string

  const { data: conversations } = await listConversations(
    supabase,
    tenantId,
    agentId
  )

  let activeConversationId: string
  let conversationList = conversations ?? []

  if (conversationList.length === 0) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        agent_id: agentId,
        user_id: (await supabase.auth.getUser()).data.user!.id,
        title: 'New conversation',
      })
      .select('*')
      .single()

    if (newConv) {
      conversationList = [newConv]
      activeConversationId = newConv.id
    } else {
      activeConversationId = ''
    }
  } else {
    activeConversationId = conversationList[0].id
  }

  const { data: messagesRaw } = await getMessages(supabase, activeConversationId)

  const initialMessages: Message[] = (messagesRaw ?? []).map((m) => ({
    id: m.id,
    role: m.role as Message['role'],
    content: m.content,
  }))

  return (
    <ChatPageClient
      agent={agent}
      agentId={agentId}
      tenantId={tenantId}
      tenantSlug={slug}
      conversations={conversationList}
      activeConversationId={activeConversationId}
      initialMessages={initialMessages}
    />
  )
}
