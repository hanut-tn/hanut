import { redirect } from 'next/navigation'
import { getUserContext } from '@/lib/get-context'
import { createServiceClient } from '@/lib/supabase/service'
import TeamPageClient from '@/components/team/TeamPageClient'

export default async function TeamPage() {
  const context = await getUserContext()
  if (!context) redirect('/login')
  if (context.role !== 'admin') redirect('/dashboard')
  if (context.plan !== 'pro' && context.plan !== 'business') redirect('/settings?tab=abonnement')

  const serviceClient = createServiceClient()

  const [membersRes, logsRes] = await Promise.all([
    serviceClient
      .from('team_members')
      .select('id, email, name, role, status, invited_at, joined_at, user_id, expires_at')
      .eq('seller_id', context.sellerId)
      .order('invited_at', { ascending: true }),

    serviceClient
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .eq('seller_id', context.sellerId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  // Fetch last_sign_in_at for each active member
  const members = (membersRes.data ?? []) as TeamMember[]
  const userIds = [...new Set(members.map(m => m.user_id).filter(Boolean) as string[])]

  const lastSignInMap: Record<string, string | null> = {}
  if (userIds.length > 0) {
    // getUserById en parallèle : O(max latency) pour N membres,
    // contre O(tous les users de l'app) avec listUsers({ perPage: 1000 }).
    const userResults = await Promise.allSettled(
      userIds.map(id => serviceClient.auth.admin.getUserById(id))
    )
    for (const result of userResults) {
      if (result.status === 'fulfilled' && !result.value.error && result.value.data.user) {
        const u = result.value.data.user
        lastSignInMap[u.id] = u.last_sign_in_at ?? null
      }
    }
  }

  const membersWithSignIn = members.map(m => ({
    ...m,
    last_sign_in_at: m.user_id ? (lastSignInMap[m.user_id] ?? null) : null,
  }))

  return (
    <TeamPageClient
      sellerId={context.sellerId}
      currentUserId={context.userId}
      plan={context.plan}
      members={membersWithSignIn}
      initialLogs={(logsRes.data ?? []) as ActivityLog[]}
      initialTotal={logsRes.count ?? 0}
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
  last_sign_in_at?: string | null
  expires_at?: string | null
}

export type ActivityLog = {
  id: string
  seller_id: string
  user_id: string | null
  user_name: string
  action_type: string
  entity_type: string | null
  entity_id: string | null
  description: string
  metadata: Record<string, unknown>
  created_at: string
}
