import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { redirect } from 'next/navigation'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'

export default async function AnalyticsPage() {
  const context = await getUserContext()
  if (!context) return null
  if (context.role === 'operator') redirect('/orders')

  const supabase = await createServerClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const iso = ninetyDaysAgo.toISOString()

  const [{ data: orders }, { data: deliveries }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, cod_amount, status, created_at, product:products(id, name), customer:customers(id, name, city)')
      .eq('seller_id', context.sellerId)
      .is('deleted_at', null)
      .gte('created_at', iso)
      .order('created_at', { ascending: true }),
    supabase
      .from('deliveries')
      .select('carrier, fee, cod_collected, cod_reversed, order:orders(status, cod_amount, created_at, seller_id, deleted_at)')
      .order('created_at', { ascending: false }),
  ])

  // Filter deliveries to only this seller (RLS should handle it, but double-check)
  const sellerDeliveries = (deliveries ?? []).filter(d => {
    const o = Array.isArray(d.order) ? d.order[0] : d.order
    return (o as any)?.seller_id === context.sellerId && (o as any)?.deleted_at === null
  })

  return (
    <AnalyticsClient
      orders={(orders ?? []) as any[]}
      deliveries={sellerDeliveries as any[]}
    />
  )
}
