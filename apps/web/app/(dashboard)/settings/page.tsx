import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { getUserContext } from '@/lib/get-context'
import SettingsClient from '@/components/settings/SettingsClient'
import { updateProfile, updateSlug, checkSlugAvailability } from './actions'

type Props = {
  searchParams: Promise<{ tab?: string }>
}

export default async function SettingsPage({ searchParams }: Props) {
  const { tab } = await searchParams
  const context = await getUserContext()
  if (!context) return null
  if (!context.isSeller) redirect('/orders')

  const serviceClient = createServiceClient()

  const headersList = await headers()
  const host = headersList.get('host') ?? 'hanut.tn'
  const appUrl = host.startsWith('localhost') ? `http://${host}` : `https://${host}`

  const { data: seller } = await serviceClient
    .from('sellers')
    .select('name, email, phone, plan, subscription_end, created_at, slug')
    .eq('id', context.sellerId)
    .single()

  const [{ count: productCount }, { count: customerCount }, { count: orderCount }, { count: memberCount }] = await Promise.all([
    serviceClient.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', context.sellerId),
    serviceClient.from('customers').select('id', { count: 'exact', head: true }).eq('seller_id', context.sellerId),
    serviceClient.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', context.sellerId).is('deleted_at', null),
    serviceClient.from('team_members').select('id', { count: 'exact', head: true }).eq('seller_id', context.sellerId).eq('status', 'active'),
  ])

  return (
    <SettingsClient
      seller={{
        name: seller?.name ?? '',
        email: seller?.email ?? '',
        phone: seller?.phone ?? '',
        plan: (seller?.plan ?? 'starter') as 'starter' | 'pro' | 'business',
        subscription_end: seller?.subscription_end ?? null,
        created_at: seller?.created_at ?? null,
        slug: seller?.slug ?? null,
      }}
      stats={{
        products: productCount ?? 0,
        customers: customerCount ?? 0,
        orders: orderCount ?? 0,
        members: memberCount ?? 0,
      }}
      appUrl={appUrl}
      initialTab={tab === 'abonnement' ? 'plan' : tab === 'lien' ? 'link' : tab}
      updateProfile={updateProfile}
      updateSlug={updateSlug}
      checkSlugAvailability={checkSlugAvailability}
    />
  )
}
