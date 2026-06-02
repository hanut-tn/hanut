import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/get-context'
import { createServiceClient } from '@/lib/supabase/service'
import TeamClient from '@/components/settings/TeamClient'

export default async function TeamPage() {
  const context = await getUserContext()
  if (!context) redirect('/login')
  if (context.role !== 'admin') redirect('/settings')

  const serviceClient = createServiceClient()

  const { data: members } = await serviceClient
    .from('team_members')
    .select('id, email, name, role, status, invited_at, joined_at, user_id')
    .eq('seller_id', context.sellerId)
    .order('invited_at', { ascending: true })

  return (
    <TeamClient
      plan={context.plan}
      sellerId={context.sellerId}
      currentUserId={context.userId}
      members={(members ?? []) as TeamMember[]}
    />
  )
}

export type TeamMember = {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'operator' | 'readonly'
  status: 'pending' | 'active'
  invited_at: string
  joined_at: string | null
  user_id: string | null
}
