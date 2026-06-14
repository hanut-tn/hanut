import * as React from 'react'
import { createServerClient } from './supabase/server'
import { createServiceClient } from './supabase/service'

export async function getMonthlyOrderCount(sellerId: string): Promise<number> {
  const supabase = await createServerClient()
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .is('deleted_at', null)
    .gte('created_at', firstOfMonth)
  return count ?? 0
}

export type UserRole = 'admin' | 'operator' | 'readonly'

export type UserContext = {
  userId: string
  sellerId: string
  role: UserRole
  isSeller: boolean
  plan: 'starter' | 'pro' | 'business'
  demoExpiresAt: string | null
  demoExpired: boolean
  daysLeft: number | null
}

function computeDemoStatus(subscriptionEnd: string | null): Pick<UserContext, 'demoExpiresAt' | 'demoExpired' | 'daysLeft'> {
  if (!subscriptionEnd) {
    return { demoExpiresAt: null, demoExpired: false, daysLeft: null }
  }
  const expiresAt = new Date(subscriptionEnd)
  const diffMs = expiresAt.getTime() - Date.now()
  if (diffMs <= 0) {
    return { demoExpiresAt: subscriptionEnd, demoExpired: true, daysLeft: 0 }
  }
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return { demoExpiresAt: subscriptionEnd, demoExpired: false, daysLeft }
}

type CacheFn = <T extends (...args: never[]) => unknown>(fn: T) => T

const reactWithCache = React as typeof React & { cache?: CacheFn }
const cacheFn: CacheFn = reactWithCache.cache ?? ((fn) => fn)

// React.cache() déduplique les appels dans la même requête HTTP quand il est disponible.
export const getUserContext = cacheFn(async (): Promise<UserContext | null> => {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Un compte créé par inviteUserByEmail conserve ce marqueur dans ses
  // métadonnées Auth. Il ne doit jamais devenir propriétaire de boutique par
  // accident si son accès équipe est ensuite supprimé.
  const isInvitedUser = typeof user.user_metadata?.invitation_token === 'string'

  // L'utilisateur est-il un vendeur (owner = toujours admin) ?
  const { data: seller } = await supabase
    .from('sellers')
    .select('id, plan, subscription_end')
    .eq('id', user.id)
    .maybeSingle()

  if (seller && !isInvitedUser) {
    return {
      userId: user.id,
      sellerId: seller.id,
      role: 'admin',
      isSeller: true,
      plan: seller.plan as UserContext['plan'],
      ...computeDemoStatus(seller.subscription_end ?? null),
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
    const { data: sellerData, error: sellerError } = await serviceClient
      .from('sellers')
      .select('plan, subscription_end')
      .eq('id', member.seller_id)
      .single()

    // Ne jamais attribuer un plan par défaut si la boutique liée est absente
    // ou inaccessible : sans contexte vendeur fiable, l'accès doit échouer.
    if (sellerError || !sellerData) return null

    return {
      userId: user.id,
      sellerId: member.seller_id,
      role: member.role as UserRole,
      isSeller: false,
      plan: sellerData.plan as UserContext['plan'],
      ...computeDemoStatus(sellerData.subscription_end ?? null),
    }
  }

  return null
})
