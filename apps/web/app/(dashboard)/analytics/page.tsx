import { createServerClient } from '@/lib/supabase/server'
import { getUserContext } from '@/lib/get-context'
import { redirect } from 'next/navigation'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'

type AnalyticsOrderRow = {
  id: string
  cod_amount: number
  status: string
  created_at: string
  product: { id: string; name: string } | { id: string; name: string }[] | null
  customer: { id: string; name: string; city?: string | null } | { id: string; name: string; city?: string | null }[] | null
}

type DeliveryOrderRow = {
  status: string
  cod_amount: number
  created_at: string
  seller_id: string
  deleted_at: string | null
}

type AnalyticsDeliveryRow = {
  carrier: string
  fee: number | null
  cod_collected: boolean
  cod_reversed: boolean
  order: DeliveryOrderRow | DeliveryOrderRow[] | null
}

export default async function AnalyticsPage() {
  const context = await getUserContext()
  if (!context) return null
  if (context.role === 'operator') redirect('/orders')

  const supabase = await createServerClient()

  // Starter: 30 jours, Pro/Business: 180 jours (90j période + 90j comparaison)
  const windowDays = context.plan === 'starter' ? 30 : 180
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)
  const iso = cutoff.toISOString()

  // Cast as unknown to prevent TypeScript from hanging on Supabase join generics.
  const [{ data: ordersRaw }, { data: deliveriesRaw }] = (await Promise.all([
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
  ])) as unknown as [{ data: AnalyticsOrderRow[] | null }, { data: AnalyticsDeliveryRow[] | null }]

  // Filter deliveries to only this seller (RLS should handle it, but double-check)
  const sellerDeliveries = (deliveriesRaw ?? []).filter(d => {
    const o = Array.isArray(d.order) ? d.order[0] : d.order
    return o?.seller_id === context.sellerId && o?.deleted_at === null
  })

  return (
    <AnalyticsClient
      orders={ordersRaw ?? []}
      deliveries={sellerDeliveries}
      plan={context.plan}
    />
  )
}
