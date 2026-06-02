import { cache } from 'react'
import { createServerClient } from './supabase/server'
import { createServiceClient } from './supabase/service'

export type UserRole = 'admin' | 'operator' | 'readonly'

export type UserContext = {
  userId: string
  sellerId: string
  role: UserRole
  isSeller: boolean
  plan: 'starter' | 'pro' | 'business'
}

// React.cache() déduplique les appels dans la même requête HTTP
export const getUserContext = cache(async (): Promise<UserContext | null> => {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // L'utilisateur est-il un vendeur (owner = toujours admin) ?
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, plan')
    .eq('id', user.id)
    .maybeSingle()

  if (seller) {
    return {
      userId: user.id,
      sellerId: seller.id,
      role: 'admin',
      isSeller: true,
      plan: (seller.plan ?? 'starter') as UserContext['plan'],
    }
  }

  // Sinon, est-il membre d'une équipe ?
  const serviceClient = createServiceClient()
  const { data: member } = await serviceClient
    .from('team_members')
    .select('seller_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (member) {
    const { data: sellerData } = await serviceClient
      .from('sellers')
      .select('plan')
      .eq('id', member.seller_id)
      .single()

    return {
      userId: user.id,
      sellerId: member.seller_id,
      role: member.role as UserRole,
      isSeller: false,
      plan: (sellerData?.plan ?? 'starter') as UserContext['plan'],
    }
  }

  return null
})
