import { createServerClient } from '@/lib/supabase/server'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [{ data: orders }, { data: deliveries }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, cod_amount, status, created_at, product:products(id, name)')
      .eq('seller_id', user.id)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: true }),
    supabase
      .from('deliveries')
      .select('fee, cod_collected, cod_reversed, order:orders(seller_id)')
      .order('created_at', { ascending: false }),
  ])

  const allOrders = await supabase
    .from('orders')
    .select('id, cod_amount, status, created_at, customer:customers(city)')
    .eq('seller_id', user.id)
    .gte('created_at', ninetyDaysAgo.toISOString())

  return (
    <AnalyticsClient
      orders={(orders ?? []) as any[]}
      ordersWithCity={(allOrders.data ?? []) as any[]}
      deliveries={(deliveries ?? []) as any[]}
    />
  )
}
