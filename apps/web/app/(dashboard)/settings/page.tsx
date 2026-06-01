import { createServerClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/settings/SettingsClient'
import { updateProfile } from './actions'

export default async function SettingsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: seller } = await supabase
    .from('sellers')
    .select('name, email, phone, plan, subscription_end, created_at')
    .eq('id', user.id)
    .single()

  const [{ count: productCount }, { count: customerCount }, { count: orderCount }] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', user.id),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('seller_id', user.id),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', user.id),
  ])

  return (
    <SettingsClient
      seller={{
        name: seller?.name ?? '',
        email: seller?.email ?? user.email ?? '',
        phone: seller?.phone ?? '',
        plan: (seller?.plan ?? 'starter') as 'starter' | 'pro' | 'business',
        subscription_end: seller?.subscription_end ?? null,
        created_at: seller?.created_at ?? null,
      }}
      stats={{
        products: productCount ?? 0,
        customers: customerCount ?? 0,
        orders: orderCount ?? 0,
      }}
      updateProfile={updateProfile}
    />
  )
}
